import { Button } from "primereact/button";
import ActionDialog from "./ActionButtons/ActionDialog";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_CATEGORY } from "../lib/mutations";
import { useEffect } from "react";
import Auth from "../lib/auth";
import { executeQuery } from "../lib/util";
import Item from "./Item";
import ItemActionBar from "./ItemActionBar";

export default function List() {
  const [reload, setReload] = useState(0);
  const [show, setShow] = useState({
    showCreateList: false,
    showCreateItem: false,
    showItemList: false,
  });

  const [createCategory] = useMutation(CREATE_CATEGORY);

  const forceReload = () => setReload((prev) => prev + 1);

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
          method={createCategory}
        />
      )}

      {data?.allCategories &&
        Object.values(data.allCategories).map((val, idx) => {
          const { _id, notes, title, items } = val;
          return (
            <div key={_id} className="py-1">
              <h4>{title}</h4>
              <div>
                <div className="d-flex align-items-center gap-2">
                  Items: {items.length}
                  <ItemActionBar
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
