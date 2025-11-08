import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { useState, useEffect } from "react";

export default function FormDialog({
  onHide = () => {},
  method,
  fields = {},
  show = true,
  title,
  submitLabel,
  onSuccess = () => {},
  onError = () => {},
}) {
  const [submitData, setSubmitData] = useState({});

  // Set any initial starting data
  useEffect(() => {
    if (
      (Object.keys(submitData) || !Object.keys(fields)) &&
      Object.keys(submitData.length) === Object.keys(fields).length
    )
      return;

    const initData = Object.keys(fields).reduce((acc, key) => {
      acc[key] =
        submitData[key] !== undefined ? submitData[key] : fields[key].value;
      return acc;
    }, {});
    setSubmitData(initData);
  }, [fields]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data, errors } = await method({ variables: { ...submitData } });
      if (errors && errors.length) throw errors[0];
      onSuccess(data);
    } catch (e) {
      console.error(e);
      onError(e);
    }
  };

  return (
    <Dialog visible={show} header={title} onHide={onHide}>
      <form onSubmit={handleFormSubmit} className="justify-content-center">
        {fields.map(([key, field], idx) => {
          return (
            <InputText
              key={idx}
              name={field.label}
              value={submitData[key]}
              onChange={(e) => {
                const newVal = e.value;
                setSubmitData((prev) => ({ ...prev, [key]: newVal }));
              }}
              minLength={field.minLength}
              maxLength={field.maxLength}
              required={field.required}
            />
          );
        })}

        <div className="justify-content-center d-flex">
          <Button type="submit" className="my-1">
            {submitLabel || "Submit"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
