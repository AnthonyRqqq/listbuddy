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
        confirmText={() => {
          return (
            <div className="d-flex flex-column justify-content-center flex-wrap text-center">
              <div className="py-1">Are you sure you want to delete "{recordName}"?</div>
              <div className="py-1">All records contained within the deleted record will also be deleted.</div>
              <div className="py-1 bold underline">This action cannot be undone.</div>
            </div>
          )
        }}
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
        className="sm-button"
        size="small"
      />
    </>
  );
}
