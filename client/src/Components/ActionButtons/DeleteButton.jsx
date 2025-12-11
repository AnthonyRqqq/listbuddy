import { Button } from "primereact/button";
import { useMutation } from "@apollo/client/react";
import { DELETE_RECORD } from "../../lib/mutations";
import ConfirmDialog from "./ConfirmDialog";
import { useState } from "react";

export default function DeleteButton({ table, recordId, recordName, refetch }) {
  const [show, setShow] = useState(false);
  const [deleteRecord] = useMutation(DELETE_RECORD);
  const variables = { table, recordId };

  return (
    <>
      <ConfirmDialog
        show={show}
        onHide={() => setShow(false)}
        title={`Delete Record`}
        confirmText={`Are you sure you want to delete "${recordName}"? This action cannot be undone.`}
        variables={variables}
        method={deleteRecord}
        onSuccess={() => {
          setShow(false);
          refetch();
        }}
        setShow={setShow}
      />

      <Button
        icon="pi pi-trash"
        onClick={(e) => {
          setShow(true);
          e.target.blur();
        }}
        rounded
      />
    </>
  );
}
