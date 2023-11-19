import "./Login.css";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  // check logged in
  const navigate = useNavigate();
  useEffect(() => {
    const checkLogin = async () => {
      const response = await fetch("http://localhost:3600", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      console.log(data);
      if (data.loggedIn) {
        navigate("/");
      } else {
        navigate("/login");
      }
    };
    checkLogin();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = () => {
    // console.log(formData);
    const checkLogin = async () => {
      const response = await fetch("http://localhost:3600/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await response.json();
      console.log(data);
      if (data.loggedIn) {
        navigate("/");
      } else {
        alert("Wrong username or password");
        setFormData({
          username: "",
          password: "",
        });
      }
    };
    checkLogin();
  };

  return (
    <div className="login">
      <div className="login-content">
        <h1>Log in</h1>
        <form>
          <input
            placeholder="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
          />
          <input
            placeholder="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
          <button type="button" value="Submit" onClick={handleSubmit}>
            Submit
          </button>
        </form>
        <div className="sign-up">
          <div>Dont have an account?</div>
          <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
