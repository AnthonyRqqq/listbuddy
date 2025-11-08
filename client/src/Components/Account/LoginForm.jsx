import AccountForm from "./AccountForm";

export default function LoginForm({ verifyLogin, show, onHide, setShowSignupForm, afterLogin }) {
  return (
    <AccountForm
      show={show}
      onHide={onHide}
      setShowSignupForm={setShowSignupForm}
      afterLogin={afterLogin}
      verifyLogin={verifyLogin}
    />
  );
}
