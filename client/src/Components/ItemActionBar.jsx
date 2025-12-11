import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useEffect } from "react";
import { CREATE_RECORD } from "../lib/mutations";
import Auth from "../lib/auth";

export default function ItemActionBar({ listId, show, setShow, refetch }) {
  const [createRecord] = useMutation(CREATE_RECORD);

  const fields = {
    title: {
      label: "Name",
      required: true,
    },
    quantity: {
      label: "Quantity",
      required: true,
      value: 0,
    },
    location: {
      value: listId,
      hidden: true,
    },
  };

  const addtlUpdates = [
    { parentTable: "Category", parentId: listId, field: "items" },
  ];

  return (
    <>
      {show && (
        <ActionDialog
          title="Create Item"
          onHide={() => setShow(false)}
          onSuccess={() => {
            setShow(false);
            refetch();
          }}
          fields={fields}
          method={createRecord}
          table="Item"
          addtlUpdates={addtlUpdates}
        />
      )}

      <Button
        onClick={(e) => {
          e.target.blur();
          setShow(listId);
        }}
        icon="pi pi-plus"
        rounded
        className="sm-button"
        size="small"
      />
    </>
  );
}
