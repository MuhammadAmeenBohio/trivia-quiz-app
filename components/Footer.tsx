import { GitBranchIcon } from "lucide-react";

const REPO_URL = "https://github.com/MuhammadAmeenBohio/trivia-quiz-app";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 text-xs text-muted-foreground">
        <span>Trivia Quiz · questions from Open Trivia DB</span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <GitBranchIcon className="size-3.5" />
          GitHub
        </a>
      </div>
    </footer>
  );
}
