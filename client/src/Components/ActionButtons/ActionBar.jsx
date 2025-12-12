import { Button } from "primereact/button";
import DeleteButton from "./DeleteButton";
import CreateButton from "./CreateButton";

export default function ActionBar({
  data,
  table,
  refetch,
  createFields,
  addtlUpdates,
  tableName,
  showDelete = true,
  showCreate = false,
  showEdit = true,
  showExpand = true,
}) {
  return (
    <div className="py-2 d-flex gap-2 align-items-center">
      {showCreate && (
        <CreateButton
          table={table}
          fields={createFields}
          tableName={tableName}
          refetch={refetch}
          addtlUpdates={addtlUpdates}
        />
      )}

      {showExpand && (
        <Button
          icon="pi pi-pencil"
          rounded
          className="sm-button"
          size="small"
        />
      )}

      {showEdit && (
        <Button
          icon="pi pi-chevron-down"
          rounded
          className="sm-button"
          size="small"
        />
      )}

      {showDelete && (
        <DeleteButton
          table={table}
          recordId={data._id}
          recordName={data.title}
          refetch={refetch}
        />
      )}
    </div>
  );
}
