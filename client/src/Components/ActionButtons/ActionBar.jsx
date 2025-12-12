import { Button } from "primereact/button";
import DeleteButton from "./DeleteButton";
import CreateButton from "./CreateButton";

export default function ActionBar({
  data,
  table,
  refetch,
  create = false,
  createFields,
  addtlUpdates,
  tableName,
}) {
  return (
    <div className="py-2 d-flex gap-2 align-items-center">
      {create && (
        <CreateButton
          table={table}
          fields={createFields}
          tableName={tableName}
          refetch={refetch}
          addtlUpdates={addtlUpdates}
        />
      )}

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
