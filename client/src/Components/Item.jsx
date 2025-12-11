import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useEffect } from "react";
import Auth from "../lib/auth";
import Col from "./Templates/Col";
import DeleteButton from "./ActionButtons/DeleteButton";

export default function Item({ data, refetch }) {
  return (
    <div className="py-2">
      {data.map((item) => {
        return (
          <div className="py-2 d-flex gap-2 align-items-center">
            <Col size={1}>{item.title}</Col>
            <Col size={1}>{item.quantity}</Col>
            <Button icon="pi pi-pencil" rounded className="sm-button" size="small" />
            <Button icon="pi pi-chevron-down" rounded className="sm-button" size="small" />
            <DeleteButton
              table="Item"
              recordId={item._id}
              recordName={item.title}
              refetch={refetch}
            />
          </div>
        );
      })}
    </div>
  );
}
