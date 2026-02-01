import { NavLink } from "react-router-dom";
import "../Styles/Header.css";

function Header() {
  return (
    <header className="header">
      <nav className="navbar">
        <div className="brand">Debt Discipline</div>

        <div className="navLinks">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "navLink navLinkActive" : "navLink"
            }
          >
            Debt Tracker
          </NavLink>

          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive ? "navLink navLinkActive" : "navLink"
            }
          >
            Contact
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

export default Header;
