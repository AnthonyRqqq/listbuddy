import AccountForm from "./AccountForm";

export default function SignupForm({ verifyLogin, show, onHide, setShowLogin, afterLogin }) {
  return (
    <AccountForm
      show={show}
      onHide={onHide}
      setShowLogin={setShowLogin}
      afterLogin={afterLogin}
      verifyLogin={verifyLogin}
      signup={true}
    />
  );
}
