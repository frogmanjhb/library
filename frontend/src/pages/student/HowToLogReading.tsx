import { Link } from 'react-router-dom'
import { BookOpen, ArrowLeft, LogOut, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'

export const HowToLogReading = () => {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50">
      <header className="bg-primary text-white shadow-buttonHover">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                How to Log Your Reading
              </h1>
              <p className="text-white/90 mt-1 font-medium">
                Simple steps to earn points (after librarian/teacher approval).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button asChild variant="secondary" className="gap-2">
                <Link to="/student/dashboard" aria-label="Back to student dashboard">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="secondary" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Steps */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">How to Log Your Reading</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">1. Read a Book</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Finish your book before logging it.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">2. Log Your Book on Pageforge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-2">Fill in:</p>
                <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                  <li>Book title</li>
                  <li>Author</li>
                  <li>Rating (how much you enjoyed it)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  3. Add Your Summary (Important)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  You can earn up to 5 extra points:
                </p>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <ul className="list-disc ml-5 space-y-1">
                    <li>
                      <span className="font-semibold">1 point</span> - Write one correct sentence
                    </li>
                    <li>
                      <span className="font-semibold">4 points</span> - Write 2-3 sentences explaining the story
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="font-semibold">Not enough:</p>
                    <p className="text-muted-foreground">
                      This book is cool = 0 points
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="font-semibold">Do this:</p>
                    <p className="text-muted-foreground">
                      Tell us what actually happens in the story.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">4. Add the Lexile Level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">At school:</p>
                  <p className="text-muted-foreground">
                    Check inside the front cover (top right).
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium">At home:</p>
                  <p className="text-muted-foreground">
                    Look it up or ask a teacher or librarian.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">5. Submit Your Book</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your book will be reviewed by a teacher or librarian.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Points */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">How Points Work</h2>
          </div>

          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Base Points (from Lexile level)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="table-auto w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-muted-foreground border-b">
                        Lexile
                      </th>
                      <th className="text-left p-3 text-sm font-semibold text-muted-foreground border-b">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-b text-sm text-foreground">100-500</td>
                      <td className="p-3 border-b text-sm font-medium">5</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b text-sm text-foreground">500-700</td>
                      <td className="p-3 border-b text-sm font-medium">10</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b text-sm text-foreground">700-800</td>
                      <td className="p-3 border-b text-sm font-medium">15</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b text-sm text-foreground">800-900</td>
                      <td className="p-3 border-b text-sm font-medium">20</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-sm text-foreground">900+</td>
                      <td className="p-3 text-sm font-medium">25</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Separator className="my-4" />

              <div className="space-y-5">
                <div>
                  <p className="font-semibold mb-2">Bonus Points</p>
                  <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                    <li>Up to +5 points for a good summary</li>
                    <li>Longer books may earn a small bonus</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Special Rules</p>
                  <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                    <li>Some books (like graphic novels) may earn fewer points</li>
                    <li>Some books may have fixed points</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Important */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Important</h2>
          </div>

          <Card className="border-primary/10">
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Be honest when logging.
              </p>
              <p className="text-muted-foreground">
                Write your own summaries.
              </p>
              <p className="text-muted-foreground">
                All books must be approved before points count.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Goal */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Goal</h2>
          </div>

          <Card className="border-primary/10">
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Read regularly, challenge yourself, and move up the ranks:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Novice</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Adept</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Guardian</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Champion</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Master</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Hero</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Legend</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Mythic</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-semibold">Apex</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

