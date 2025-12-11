import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import Auth from "../../lib/auth";

export default function ConfirmDialog({
  onHide = () => {},
  onShow = () => {},
  method,
  show = true,
  setShow,
  title,
  submitLabel,
  cancelLabel,
  confirmText,
  variables,
  onSuccess = () => {},
  onError = () => {},
}) {
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    let user;
    if (Auth.loggedIn()) user = Auth.getUser();

    try {
      const { data, errors } = await method({
        variables: { ...variables, user_id: user?.data._id },
      });

      if (errors && errors.length) throw errors[0];
      onSuccess(data);
    } catch (e) {
      console.error(e);
      onError(e);
    }
  };

  return (
    <Dialog visible={show} header={title} onShow={onShow} onHide={onHide}>
      {confirmText && (
        <div className="justify-content-center d-flex pb-2">
          {typeof confirmText === "function" ? confirmText() : confirmText}
        </div>
      )}

      <div className="justify-content-center d-flex">
        <Button onClick={handleFormSubmit} className="my-1 mx-1" rounded>
          {submitLabel || "Submit"}
        </Button>
        <Button onClick={() => setShow(false)} className="my-1 mx-1" rounded>
          {cancelLabel || "Nevermind"}
        </Button>
      </div>
    </Dialog>
  );
}
