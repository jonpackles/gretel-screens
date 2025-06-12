export default function Nav() {
  return (
    <nav className="p-4 flex justify-center">
          <div id='nav' className="flex gap-4">
            <a href="/">Home</a>
            <a href="/dashboard/content">Dashboard</a>
            <a href="/screens/screen-a">Screen A</a>
            <a href="/screens/screen-b">Screen B</a>
            <a href="/screens/test-page">Test Page</a>
            <a href="/screens/calendar-test">Calendar Test</a>
          </div>
    </nav>
  )
}