import ActionBar from "./ActionButtons/ActionBar";

export default function ItemActionBar({ data, listId, refetch }) {
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
    <ActionBar
      data={data}
      table="Item"
      refetch={refetch}
      createFields={fields}
      addtlUpdates={addtlUpdates}
      showCreate
      showDelete={false}
      showExpand={false}
      showEdit={false}
    />
  );
}
