from training.train_goal_agent import train_goal_agent
from training.train_investment_agent import train_investment_agent
from training.train_risk_agent import train_risk_agent
from training.train_spending_agent import train_spending_agent


def train_all_agents() -> dict:
    return {
        "spending_agent": train_spending_agent(),
        "investment_agent": train_investment_agent(),
        "risk_agent": train_risk_agent(),
        "goal_agent": train_goal_agent(),
    }


if __name__ == "__main__":
    print(train_all_agents())
