import { Router, Route } from '@solidjs/router'
import './App.css'
import Navbar from './components/Navbar'
import Pool from './pages/Pool'

function App() {

  return (
    <>
      <Router
      root={(props) => (
        <>
          <Navbar />
          {props.children}
        </>
      )}
    >
        <Route path="/pool/:contractId" component={Pool} />
      </Router>
    </>
  )
}

export default App
