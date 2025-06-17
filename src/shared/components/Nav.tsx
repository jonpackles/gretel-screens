export default function Nav() {
  return (
    <nav className="p-4 flex justify-center">
          <div id='nav' className="flex gap-4">
            <a href="/">Home</a>
            <a href="/dashboard/content">Dashboard</a>
            <a href="/screen-a">Screen A</a>
            <a href="/screen-b">Screen B</a>
          </div>
    </nav>
  )
}