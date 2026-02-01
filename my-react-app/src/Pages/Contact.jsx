import { useState } from "react";
import "../Styles/Contact.css";

function Contact() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    comments: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Normally you'd send this to an API here
    console.log("Contact form submitted:", form);

    setSubmitted(true);

    // Optional: clear form data after success
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      comments: "",
    });
  };

  if (submitted) {
    return (
      <div className="contactPage">
        <h1 className="contactTitle">Thank you!</h1>
        <p className="contactSubtitle">
          Your message has been received. We’ll get back to you shortly.
        </p>

        <button
          className="contactButton"
          type="button"
          onClick={() => setSubmitted(false)}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="contactPage">
      <h1 className="contactTitle">Contact</h1>
      <p className="contactSubtitle">
        Send a message and we’ll get back to you as soon as possible.
      </p>

      <form className="contactForm" onSubmit={handleSubmit}>
        <div className="contactRow2">
          <div className="contactField">
            <label className="contactLabel" htmlFor="firstName">
              First name
            </label>
            <input
              className="contactInput"
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              placeholder="First name"
            />
          </div>

          <div className="contactField">
            <label className="contactLabel" htmlFor="lastName">
              Last name
            </label>
            <input
              className="contactInput"
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="contactField">
          <label className="contactLabel" htmlFor="email">
            Email
          </label>
          <input
            className="contactInput"
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />
        </div>

        <div className="contactField">
          <label className="contactLabel" htmlFor="comments">
            Comments
          </label>
          <textarea
            className="contactTextarea"
            id="comments"
            name="comments"
            value={form.comments}
            onChange={handleChange}
            placeholder="Write your message..."
            rows={6}
          />
        </div>

        <div className="contactButtonRow">
          <button className="contactButton" type="submit">
            Submit
          </button>
          <span className="contactHint"></span>
        </div>
      </form>
    </div>
  );
}

export default Contact;

