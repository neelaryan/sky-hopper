"use client";

import { Card, CardContent } from "@/components/ui/card";
import Game from "@/components/game";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="text-center">
            <h1 className="font-headline text-5xl font-bold tracking-tighter text-primary">
                Sky Hopper
            </h1>
            <p className="text-muted-foreground mt-2">Tap or press Spacebar to fly. Avoid the pipes!</p>
        </div>
        <Card className="overflow-hidden shadow-2xl border-4 border-primary/20">
            <CardContent className="p-0">
                <Game />
            </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">A classic game rebuilt for the modern web.</p>
      </div>
    </main>
  );
}
