from __future__ import annotations

import argparse
from pathlib import Path

from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments

from config import settings
from schemas import FinancialMonth
from training.data_builder import build_training_dataset


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a personalized FinTwinAI model.")
    parser.add_argument("--output-dir", default=settings.personalized_model_dir)
    parser.add_argument("--base-model", default=settings.base_model_name)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--max-samples", type=int, default=2000)
    return parser.parse_args()


def _tokenize_examples(tokenizer, dataset):
    def tokenize(batch):
        texts = [
            f"### Instruction\n{prompt}\n\n### Response\n{response}"
            for prompt, response in zip(batch["prompt"], batch["response"])
        ]
        tokens = tokenizer(
            texts,
            truncation=True,
            padding="max_length",
            max_length=768,
        )
        tokens["labels"] = tokens["input_ids"].copy()
        return tokens

    return dataset.map(tokenize, batched=True, remove_columns=dataset.column_names)


def main() -> None:
    args = parse_args()
    months: list[FinancialMonth] = []
    dataset = build_training_dataset(months, max_samples=args.max_samples)
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(args.base_model)
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj"],
    )
    model = get_peft_model(model, lora_config)
    tokenized = _tokenize_examples(tokenizer, dataset)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=args.epochs,
            per_device_train_batch_size=1,
            gradient_accumulation_steps=8,
            logging_steps=10,
            save_strategy="epoch",
            learning_rate=2e-4,
            report_to="none",
        ),
        train_dataset=tokenized,
    )
    trainer.train()
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)


if __name__ == "__main__":
    main()
