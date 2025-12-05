import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_CATEGORY } from "../lib/mutations";

export default function List() {
  const [show, setShow] = useState(false);

  const [createCategory] = useMutation(CREATE_CATEGORY);

  const fields = {
    title: {
      label: "Name",
      required: true,
    },
  };

  return (
    <>
      {/* <ActionDialog show={show}/> */}
      {show && <ActionDialog fields={fields} method={createCategory} />}
      <Button
        onClick={(e) => {
          e.target.blur();
          setShow(!show);
        }}
      >
        Create List
      </Button>
    </>
  );
}
