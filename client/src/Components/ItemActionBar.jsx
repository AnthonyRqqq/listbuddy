import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useEffect } from "react";
import { CREATE_ITEM } from "../lib/mutations";
import Auth from "../lib/auth";

export default function ItemActionBar({ listId, show, setShow, refetch }) {
  const [createItem] = useMutation(CREATE_ITEM);

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
          method={createItem}
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
