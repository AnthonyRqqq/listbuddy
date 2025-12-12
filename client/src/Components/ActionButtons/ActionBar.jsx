import { Button } from "primereact/button";
import DeleteButton from "./DeleteButton";

export default function ActionBar({ data, table, refetch }) {
  return (
    <div className="py-2 d-flex gap-2 align-items-center">
      <Button icon="pi pi-pencil" rounded className="sm-button" size="small" />
      <Button
        icon="pi pi-chevron-down"
        rounded
        className="sm-button"
        size="small"
      />
      <DeleteButton
        table={table}
        recordId={data._id}
        recordName={data.title}
        refetch={refetch}
      />
    </div>
  );
}
