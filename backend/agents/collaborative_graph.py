from __future__ import annotations

from typing import Annotated, Any, Literal
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq

from config import settings
from agents.base_agent import Agent
from agents.spending_agent import SpendingAgent
from agents.investment_agent import InvestmentAgent
from agents.risk_agent import RiskAgent
from agents.goal_agent import GoalAgent
from core.digital_twin_engine import FinancialDigitalTwinEngine
from core.forecasting_engine import ForecastingScenarioEngine
from core.explainability_engine import ExplainabilityEngine
from schemas import FinancialMonth


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    profile: dict
    months: list[FinancialMonth]
    agent_outputs: dict[str, dict]
    current_agent: str | None
    collaboration_round: int
    max_rounds: int
    final_answer: str | None
    user_question: str | None
    forecast: list[dict] | None
    explanation: dict | None
    needs_collaboration: bool
    collaboration_context: str


class CollaborativeAgentSystem:
    def __init__(self):
        self.llm = ChatGroq(
            groq_api_key=settings.groq_api_key,
            model_name="qwen/qwen3.8-27b",
            temperature=0.3,
        ) if settings.groq_api_key else None

        self.twin_engine = FinancialDigitalTwinEngine()
        self.forecasting_engine = ForecastingScenarioEngine()
        self.explainability_engine = ExplainabilityEngine()

        self.agents = {
            "spending": SpendingAgent(),
            "investment": InvestmentAgent(),
            "risk": RiskAgent(),
            "goal": GoalAgent(),
        }

        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)

        workflow.add_node("supervisor", self._supervisor_node)
        workflow.add_node("spending_agent", lambda s: self._agent_node(s, "spending"))
        workflow.add_node("investment_agent", lambda s: self._agent_node(s, "investment"))
        workflow.add_node("risk_agent", lambda s: self._agent_node(s, "risk"))
        workflow.add_node("goal_agent", lambda s: self._agent_node(s, "goal"))
        workflow.add_node("synthesize", self._synthesize_node)

        workflow.set_entry_point("supervisor")

        workflow.add_conditional_edges(
            "supervisor",
            self._route_from_supervisor,
            {
                "spending": "spending_agent",
                "investment": "investment_agent",
                "risk": "risk_agent",
                "goal": "goal_agent",
                "synthesize": "synthesize",
            },
        )

        for agent_name in ["spending_agent", "investment_agent", "risk_agent", "goal_agent"]:
            workflow.add_conditional_edges(
                agent_name,
                self._route_after_agent,
                {
                    "continue": "supervisor",
                    "synthesize": "synthesize",
                },
            )

        workflow.add_edge("synthesize", END)

        return workflow.compile()

    def _supervisor_node(self, state: AgentState) -> AgentState:
        if not self.llm:
            return {**state, "current_agent": "spending", "needs_collaboration": True}

        profile = state["profile"]
        question = state.get("user_question", "")
        agent_outputs = state.get("agent_outputs", {})
        round_num = state.get("collaboration_round", 0)
        context = state.get("collaboration_context", "")

        completed_agents = set(agent_outputs.keys())
        all_agents = {"spending", "investment", "risk", "goal"}
        remaining = all_agents - completed_agents

        system_prompt = """You are the Financial Supervisor coordinating a team of specialized agents:
- Spending Agent: Analyzes cash flow, expense ratios, spending pressure
- Investment Agent: Evaluates portfolio allocation, returns, risk-adjusted performance
- Risk Agent: Assesses credit risk, debt service capacity, financial resilience
- Goal Agent: Plans for major financial goals (house, education, retirement)

Current state:
- Round: {round_num}/{max_rounds}
- Completed agents: {completed}
- Remaining agents: {remaining}
- User question: {question}
- Collaboration context so far: {context}

Decide which agent should run next, or if we should synthesize final answer.
Return ONLY one of: spending, investment, risk, goal, synthesize

Rules:
1. If round >= max_rounds, always synthesize
2. If question is specific to one domain, prioritize that agent
3. If agents need to react to each other's findings, continue collaboration
3. If all key insights gathered, synthesize"""

        user_prompt = system_prompt.format(
            round_num=round_num,
            max_rounds=state.get("max_rounds", 3),
            completed=", ".join(completed_agents) if completed_agents else "none",
            remaining=", ".join(remaining) if remaining else "none",
            question=question or "General financial analysis",
            context=context or "First round - no prior collaboration",
        )

        try:
            response = self.llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ])
            next_agent = response.content.strip().lower()

            valid_agents = ["spending", "investment", "risk", "goal", "synthesize"]
            if next_agent not in valid_agents:
                next_agent = "spending" if remaining else "synthesize"

        except Exception:
            next_agent = "spending" if remaining else "synthesize"

        return {
            **state,
            "current_agent": next_agent,
            "needs_collaboration": next_agent != "synthesize",
        }

    def _agent_node(self, state: AgentState, agent_name: str) -> AgentState:
        agent = self.agents[agent_name]
        profile = state["profile"]
        months = state["months"]

        output = agent.analyze(profile, months)

        agent_outputs = state.get("agent_outputs", {})
        agent_outputs[agent_name] = output

        collaboration_context = state.get("collaboration_context", "")
        new_context = f"{collaboration_context}\n\n{agent_name.upper()} AGENT:\nMetric: {output.get('metric', 'N/A')}\nSignal: {output.get('signal', 'N/A')}"

        messages = state.get("messages", [])
        messages.append(AIMessage(
            content=f"[{agent_name.upper()}] {output.get('signal', 'Analysis complete')}",
            name=agent_name
        ))

        return {
            **state,
            "agent_outputs": agent_outputs,
            "collaboration_context": new_context,
            "collaboration_round": state.get("collaboration_round", 0) + 1,
            "messages": messages,
        }

    def _route_from_supervisor(self, state: AgentState) -> Literal["spending", "investment", "risk", "goal", "synthesize"]:
        return state["current_agent"]

    def _route_after_agent(self, state: AgentState) -> Literal["continue", "synthesize"]:
        round_num = state.get("collaboration_round", 0)
        max_rounds = state.get("max_rounds", 3)
        agent_outputs = state.get("agent_outputs", {})

        if round_num >= max_rounds:
            return "synthesize"

        completed = len(agent_outputs)
        if completed >= 4:
            return "synthesize"

        return "continue"

    def _synthesize_node(self, state: AgentState) -> AgentState:
        if not self.llm:
            final = self._fallback_synthesis(state)
            return {**state, "final_answer": final}

        profile = state["profile"]
        agent_outputs = state.get("agent_outputs", {})
        question = state.get("user_question", "")
        forecast = state.get("forecast", [])
        explanation = state.get("explanation", {})

        system_prompt = """You are the Financial Supervisor synthesizing insights from all agents into a comprehensive answer.

Agent Outputs:
{agent_outputs}

User Question: {question}

Profile Summary:
- Monthly Income: ₹{income:,.0f}
- Monthly Outflow: ₹{outflow:,.0f}
- Savings Rate: {savings_rate:.1%}
- Debt Service Ratio: {debt_ratio:.1%}
- Credit Score: {credit_score:.0f}
- Months Tracked: {months_tracked}

Provide a cohesive, actionable financial analysis that:
1. Integrates insights from all agents
2. Highlights conflicts or synergies between agent findings
3. Gives specific, numbered recommendations
4. Answers the user's question directly
5. Uses Indian rupee context (₹)"""

        agent_summary = "\n\n".join([
            f"{name.upper()} AGENT:\n  Metric: {out.get('metric', 'N/A')}\n  Signal: {out.get('signal', 'N/A')}"
            for name, out in agent_outputs.items()
        ])

        user_prompt = system_prompt.format(
            agent_outputs=agent_summary,
            question=question or "General financial health assessment",
            income=profile.get('monthly_income', 0),
            outflow=profile.get('monthly_outflow', 0),
            savings_rate=profile.get('savings_rate', 0),
            debt_ratio=profile.get('debt_service_ratio', 0),
            credit_score=profile.get('credit_score', 0),
            months_tracked=profile.get('months_tracked', 0),
        )

        try:
            response = self.llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ])
            final = response.content
        except Exception:
            final = self._fallback_synthesis(state)

        return {**state, "final_answer": final, "messages": state.get("messages", []) + [AIMessage(content=final, name="supervisor")]}

    def _fallback_synthesis(self, state: AgentState) -> str:
        agent_outputs = state.get("agent_outputs", {})
        profile = state["profile"]

        lines = ["**Collaborative Financial Analysis**\n"]
        for name, out in agent_outputs.items():
            lines.append(f"**{name.title()} Agent:** {out.get('signal', 'No signal')}")

        lines.append(f"\n**Profile:** Income ₹{profile.get('monthly_income', 0):,.0f}/mo | Outflow ₹{profile.get('monthly_outflow', 0):,.0f}/mo | Savings {profile.get('savings_rate', 0):.1%}")
        return "\n".join(lines)

    def run(
        self,
        months: list[FinancialMonth],
        user_question: str | None = None,
        max_rounds: int = 3,
    ) -> dict[str, Any]:
        profile = self.twin_engine.build_profile(months)
        forecast = self.forecasting_engine.simulate(
            profile=profile,
            months=months,
            model="xgboost",
            scenario="baseline",
            horizon=6,
        )
        explanation = self.explainability_engine.explain(profile)

        initial_state: AgentState = {
            "messages": [HumanMessage(content=user_question or "Analyze my financial health")],
            "profile": profile,
            "months": months,
            "agent_outputs": {},
            "current_agent": None,
            "collaboration_round": 0,
            "max_rounds": max_rounds,
            "final_answer": None,
            "user_question": user_question,
            "forecast": forecast,
            "explanation": explanation,
            "needs_collaboration": True,
            "collaboration_context": "",
        }

        result = self.graph.invoke(initial_state)

        return {
            "profile": profile,
            "agent_outputs": result["agent_outputs"],
            "final_answer": result["final_answer"],
            "forecast": forecast,
            "explanation": explanation,
            "collaboration_rounds": result["collaboration_round"],
            "messages": result["messages"],
        }


collaborative_system = CollaborativeAgentSystem()