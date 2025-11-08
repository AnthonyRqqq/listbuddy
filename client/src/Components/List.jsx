import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";

export default function List() {
  const [show, setShow] = useState(false);

  const fields = {
    title: {
      label: "Name",
      required: true,
    },
  };

  return (
    <>
      {/* <ActionDialog show={show}/> */}
      {show && <ActionDialog fields={fields} />}
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
