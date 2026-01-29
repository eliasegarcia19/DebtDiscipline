import { NavLink } from "react-router-dom";

function Header() {
  const linkStyle = ({ isActive }) => ({
    fontWeight: isActive ? 800 : 500,
    textDecoration: isActive ? "underline" : "none",
    marginRight: 12,
  });

  return (
    <header style={{ padding: 16 }}>
      <h2 style={{ margin: 0 }}>Debt Discipline</h2>
      <nav style={{ marginTop: 8 }}>
        <NavLink to="/" style={linkStyle}>
          Debt Tracker
        </NavLink>
        <NavLink to="/contact" style={linkStyle}>
          Contact
        </NavLink>
      </nav>
    </header>
  );
}

export default Header;
