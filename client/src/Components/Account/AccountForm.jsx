import { useState } from "react";
import Auth from "../../lib/auth";
import { useMutation } from "@apollo/client/react";
import { validateEmail } from "../../lib/util";
import { LOGIN, CREATE_USER } from "../../lib/mutations";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

export default function AccountForm({
  show,
  onHide,
  signup = false,
  setShowSignupForm,
  setShowLogin,
  afterLogin,
  verifyLogin,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Define mutations
  const [createUser] = useMutation(CREATE_USER);
  const [loginUser] = useMutation(LOGIN);

  // Handles updating the value of the correct variable
  const handleInputChange = async (e) => {
    const { target } = e;
    const inputType = target.name;
    const inputValue = target.value;
    switch (inputType) {
      case "email":
        setEmail(inputValue);
        break;
      case "password":
        setPassword(inputValue);
        break;
      case "verifyPassword":
        setVerifyPassword(inputValue);
        break;
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email))
      return setErrorMessage("Please enter a valid email address.");

    if (signup && password !== verifyPassword)
      return setErrorMessage("Password and Verify Password fields must match.");

    try {
      if (signup) {
        const createResponse = await createUser({
          variables: { email, password },
        });

        if (createResponse.error) {
          throw new Error("Error creating user: ", createResponse.error);
        }
      }

      const loginResponse = await loginUser({
        variables: { email, password },
      });

      const token = await loginResponse.data.login.token;

      await Auth.login(token);
      handleOnHide();
      if (afterLogin) await afterLogin();
      return;
    } catch (e) {
      console.error(e);
      if (signup)
        return setErrorMessage("Error creating account. Please try again.");
      else
        return setErrorMessage("Invalid email or password. Please try again.");
    }
  };

  const handleOnHide = async () => {
    setErrorMessage("");
    setPassword("");
    setVerifyPassword("");
    setEmail("");
    onHide();
  };

  const formField = ({ input, inputName, placeHolder, type }) => {
    return (
      <div className="d-flex py-1 justify-content-center">
        <InputText
          value={input}
          name={inputName}
          onChange={handleInputChange}
          type={type || inputName}
          placeholder={placeHolder}
          required
        />
      </div>
    );
  };

  return (
    <Dialog
      visible={show}
      onHide={handleOnHide}
      header={signup ? "Create Account" : "Login"}
    >
      {verifyLogin && (
        <div className="text-center">
          You must be logged in to cast this spell.
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="justify-content-center">
        {formField({
          input: email,
          inputName: "email",
          placeHolder: "Email",
        })}

        {formField({
          input: password,
          inputName: "password",
          placeHolder: "Password",
        })}

        {signup &&
          formField({
            input: verifyPassword,
            inputName: "verifyPassword",
            type: "password",
            placeHolder: "Verify Password",
          })}

        <div className="justify-content-center d-flex">
          <Button type="submit" className="my-1">
            Submit
          </Button>
        </div>
      </form>

      <div className="d-flex justify-content-center">
        <Button
          onClick={async () => {
            if (signup) setShowLogin(true);
            else setShowSignupForm(true);

            handleOnHide();
          }}
        >
          {signup
            ? "I have an account! Take me to login!"
            : "Not signed up yet? Click here!"}
        </Button>
      </div>

      {errorMessage && (
        <div>
          <p className="justify-content-center">{errorMessage}</p>
        </div>
      )}
    </Dialog>
  );
}
