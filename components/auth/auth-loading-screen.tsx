import { Card, CardContent } from "@/components/ui/card"

function AuthLoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm border border-border/70 bg-card/90">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export { AuthLoadingScreen }
