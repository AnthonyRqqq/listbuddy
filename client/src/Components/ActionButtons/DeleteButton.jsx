import { Button } from "primereact/button";
import { useMutation } from "@apollo/client/react";
import { DELETE_RECORD } from "../../lib/mutations";
import ConfirmDialog from "./ConfirmDialog";

export default function DeleteButton({
  show,
  setShow,
  table,
  recordId,
  recordName,
}) {
  const [deleteRecord] = useMutation(DELETE_RECORD);
  const variables = { table, recordId };

  return (
    <ConfirmDialog
      show={show}
      onHide={() => setShow(false)}
      title={`Delete ${recordName || "Record"}`}
      variables={variables}
      method={deleteRecord}
      onSuccess={() => setShow(false)}
    />
  );
}
