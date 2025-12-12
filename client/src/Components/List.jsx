import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_RECORD } from "../lib/mutations";
import { useEffect } from "react";
import Auth from "../lib/auth";
import { executeQuery } from "../lib/util";
import Item from "./Item";
import ItemActionBar from "./ItemActionBar";
import ActionBar from "./ActionButtons/ActionBar";
import Col from "./Templates/Col";

export default function List() {
  const [show, setShow] = useState({
    showCreateList: false,
    showCreateItem: false,
    showItemList: false,
  });

  const [createRecord] = useMutation(CREATE_RECORD);

  const fields = {
    title: {
      label: "Name",
      required: true,
    },
  };

  const user = Auth.getUser();
  const userId = user?.data?._id;

  const { data, loading, error, refetch } = executeQuery({
    queryName: "GET_ALL_CATEGORIES",
    variables: { user_id: userId },
    skip: !user,
  });

  useEffect(() => {
    if (userId) refetch();
  }, [userId]);

  useEffect(() => {
    console.log(data);
  }, [data, error]);

  return (
    <>
      {show.showCreateList && (
        <ActionDialog
          title="Create List"
          onHide={() => setShow((prev) => ({ ...prev, showCreateList: false }))}
          onSuccess={async () => {
            setShow((prev) => ({ ...prev, showCreateList: false }));
            refetch();
          }}
          fields={fields}
          method={createRecord}
          table="Category"
        />
      )}

      {data?.allCategories &&
        Object.values(data.allCategories).map((val, idx) => {
          const { _id, notes, title, items } = val;
          return (
            <div key={_id} className="py-1">
              <div className="d-flex">
                <Col size={1}>
                  <h4>{title}</h4>
                </Col>
                <ActionBar
                  showCreate={false}
                  showExpand={false}
                  data={val}
                  table="Category"
                  refetch={refetch}
                />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  Items: {items.length}
                  <ItemActionBar
                    data={val}
                    listId={_id}
                    show={show.showCreateItem === _id}
                    setShow={(val) =>
                      setShow((prev) => ({ ...prev, showCreateItem: val }))
                    }
                    refetch={refetch}
                  />
                </div>
                <Item data={items} refetch={refetch} />
              </div>
              <div>Notes: {notes.length}</div>
            </div>
          );
        })}

      <Button
        onClick={(e) => {
          e.target.blur();
          setShow((prev) => ({ ...prev, showCreateList: true }));
        }}
      >
        Create List
      </Button>
    </>
  );
}
