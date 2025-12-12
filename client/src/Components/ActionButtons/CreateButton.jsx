import { Button } from "primereact/button";
import { useMutation } from "@apollo/client/react";
import { CREATE_RECORD } from "../../lib/mutations";
import ActionDialog from "./ActionDialog";
import { useState } from "react";

export default function CreateButton({
  table,
  tableName,
  refetch,
  fields,
  addtlUpdates
}) {
  const [show, setShow] = useState(false);
  const [createRecord] = useMutation(CREATE_RECORD)

  return (
    <>
      {show && (
        <ActionDialog
          title={`Create ${tableName || table}`}
          onHide={() => setShow(false)}
          onSuccess={() => {
            setShow(false);
            refetch();
          }}
          fields={fields}
          method={createRecord}
          table={table}
          addtlUpdates={addtlUpdates}
        />
      )}

      <Button
        onClick={(e) => {
          e.target.blur();
          setShow(true);
        }}
        icon="pi pi-plus"
        rounded
        className="sm-button"
        size="small"
      />
    </>
  );
}
