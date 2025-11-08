import { useNavigate } from "react-router-dom";

import "./Nav.css";

export default function Nav() {
  const navigate = useNavigate();

  const navItems = [
    { label: "Home", path: "/" },
    { label: "My Lists", path: "/lists" },
    { label: "Shared Lists", path: "/lists/shared" },
  ];

  return (
    <ul className="nav-menu">
      {navItems.map((item, idx) => (
        <li className="nav-item" key={idx}>
          <a
            href={item.path}
            onClick={(e) => {
              e.preventDefault();
              navigate(item.path);
            }}
            className="hover-lighten focus-lighten"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
