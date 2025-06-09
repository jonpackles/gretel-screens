export default function Nav() {
  return (
    <nav className="p-4 flex justify-center">
          <div id='nav' className="flex gap-4">
            <a href="/">Home</a>
            <a href="/pages/dashboard">Dashboard</a>
            <a href="/pages/screen-a">Screen A</a>
            <a href="/pages/screen-b">Screen B</a>
            <a href="/pages/test-page">Test Page</a>
            <a href="/pages/calendar-test">Calendar Test</a>
          </div>
    </nav>
  )
}