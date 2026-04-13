import ATMImg from './assets/A&M Galv Logo.jpg'
import Registry from './views/Registry'
import Discovery from './views/Discovery'
import Settings from './views/Settings'
import Vendors from './views/Vendors'
import Orchestrate from './views/Orchestrate'
import './App.css'
import { Routes, Route, Link } from 'react-router-dom'

function App() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={ATMImg} className="base" width="500" height="85" alt="" />
          {/* <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" /> */}
        </div>
        <div>
          <h1>Agent Discovery Framework Demo</h1>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Select Discovery, Registry, or Settings view</p>

          <ul className="buttons">
            <li>
              <Link to="/vendors">Vendors</Link>
            </li>
            <li>
              <Link to="/registry">Registry</Link>
            </li>
            <li>
              <Link to="/discovery">Discovery</Link>
            </li>
            <li>
              <Link to="/orchestrate">Orchestrate</Link>
            </li>
            <li>
              <Link to="/settings">Settings</Link>
            </li>
          </ul>

          <div className="page-view">
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/registry" element={<Registry />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/orchestrate" element={<Orchestrate />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>

        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App