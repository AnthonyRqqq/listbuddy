import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useEffect } from "react";
import { CREATE_ITEM } from "../lib/mutations";
import Auth from "../lib/auth";
import Col from "./Templates/Col";

export default function Item({ data }) {

  return (
    <div className="py-2">
      {data.map((item) => {
        return (
          <div className="py-2 d-flex gap-2 align-items-center">
            <Col size={1}>{item.title}</Col>
            <Col size={1}>{item.quantity}</Col>
            <Button icon='pi pi-pencil'/>
            <Button icon='pi pi-chevron-down' />
            <Button icon='pi pi-trash' />
          </div>
        )
      })}
    </div>
  );
}
