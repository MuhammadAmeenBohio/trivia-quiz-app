import Link from "next/link";
import { BrainIcon } from "lucide-react";
import MuteToggle from "@/components/MuteToggle";
import UserMenu from "@/components/UserMenu";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <BrainIcon className="size-5" />
          </span>
          <span className="font-heading text-xl font-bold text-foreground">Trivia Quiz</span>
        </Link>
        <div className="flex items-center gap-1">
          <MuteToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
