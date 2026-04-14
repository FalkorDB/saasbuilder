import { useMemo, useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import StarIcon from "@mui/icons-material/Star";
import { Box, DialogContent, IconButton, MenuItem, Stack } from "@mui/material";
import { useMutation } from "@tanstack/react-query";

import { createInstanceUser, deleteInstanceUser, updateInstanceUser, UserACL } from "src/api/falkordb";
import Button from "src/components/Button/Button";
import DataGrid from "src/components/DataGrid/DataGrid";
import InformationDialogTopCenter, {
  DialogFooter,
  DialogHeader,
} from "src/components/Dialog/InformationDialogTopCenter";
import FieldContainer from "src/components/FormElements/FieldContainer/FieldContainer";
import FieldLabel from "src/components/FormElements/FieldLabel/FieldLabel";
import Autocomplete from "src/components/FormElementsv2/AutoComplete/AutoComplete";
import { PasswordField } from "src/components/FormElementsv2/PasswordField/PasswordField";
import Select from "src/components/FormElementsv2/Select/Select";
import TextField from "src/components/FormElementsv2/TextField/TextField";
import UsersTableHeader from "src/components/ResourceInstance/UserAccess/components/UsersTableHeader";
import {
  ACL_PRESETS,
  ACLPresetKey,
  ALLOWED_ACL_COMMANDS,
  findPresetByAcl,
  getPresetAcl,
  parseAcl,
  validateAclCommands,
} from "src/components/ResourceInstance/UserAccess/constants/aclPresets";
import useUsers from "src/components/ResourceInstance/UserAccess/hooks/useUsers";
import Tooltip from "src/components/Tooltip/Tooltip";
import { Text } from "src/components/Typography/Typography";
import useSnackbar from "src/hooks/useSnackbar";

type DialogState = {
  open: boolean;
  type?: "add" | "edit" | "delete";
  user?: UserACL;
};

type ResourceUserAccessProps = {
  instanceId: string;
  subscriptionId: string;
  status: string;
  roleType?: string;
  defaultUsername?: string;
};

const WRITE_ROLES = ["root", "editor"];

function ResourceUserAccess(props: ResourceUserAccessProps) {
  const snackbar = useSnackbar();
  const { instanceId, subscriptionId, status, roleType, defaultUsername } = props;
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [selectedPreset, setSelectedPreset] = useState<ACLPresetKey>("admin");
  const [customKeys, setCustomKeys] = useState("~*");
  const [customCommands, setCustomCommands] = useState<string[]>([]);

  const canWrite = WRITE_ROLES.includes(roleType ?? "");

  const usersQuery = useUsers({ instanceId, subscriptionId });
  const { data: usersData = [], isLoading, isRefetching, refetch } = usersQuery;

  const createMutation = useMutation({
    mutationFn: async (vars: { username: string; password: string; acl: string }) => {
      await createInstanceUser(instanceId, subscriptionId, vars);
    },
    onSuccess: () => {
      snackbar.showSuccess("User created successfully");
      refetch();
    },
    onError: (error: any) => {
      snackbar.showError(`Error: ${error.response?.data?.message ?? error}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: { username: string; password?: string; acl?: string }) => {
      const { username, ...data } = vars;
      await updateInstanceUser(instanceId, subscriptionId, username, data);
    },
    onSuccess: () => {
      snackbar.showSuccess("User updated successfully");
      refetch();
    },
    onError: (error: any) => {
      snackbar.showError(`Error: ${error.response?.data?.message ?? error}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (username: string) => {
      await deleteInstanceUser(instanceId, subscriptionId, username);
    },
    onSuccess: () => {
      snackbar.showSuccess("User deleted successfully");
      refetch();
    },
    onError: (error: any) => {
      snackbar.showError(`Error: ${error.response?.data?.message ?? error}`);
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const getResolvedAcl = (): string => {
    if (selectedPreset === "custom") {
      const keys = customKeys.trim();
      const cmds = customCommands.join(" ");
      return keys && cmds ? `${keys} ${cmds}` : keys || cmds;
    }
    const preset = ACL_PRESETS.find((p) => p.key === selectedPreset);
    return preset ? getPresetAcl(preset) : "";
  };

  const openAddEditDialog = (type: "add" | "edit", user?: UserACL) => {
    if (type === "edit" && user) {
      const preset = findPresetByAcl(user.acl);
      setSelectedPreset(preset);
      if (preset === "custom") {
        const parsed = parseAcl(user.acl);
        setCustomKeys(parsed.keys || "~*");
        setCustomCommands(parsed.commands);
      } else {
        setCustomKeys("~*");
        setCustomCommands([]);
      }
    } else {
      setSelectedPreset("admin");
      setCustomKeys("~*");
      setCustomCommands([]);
    }
    setDialog({ open: true, type, user });
  };

  const columns = useMemo(() => {
    const cols = [
      {
        field: "username",
        headerName: "Username",
        flex: 1,
        minWidth: 200,
        renderCell: (params: { row: UserACL }) => (
          <Stack direction="row" alignItems="center" gap="4px">
            <Text ellipsis>{params.row.username}</Text>
            {params.row.username === defaultUsername && (
              <Tooltip title="Principal user">
                <StarIcon sx={{ fontSize: 16, color: "#F59E0B" }} />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      {
        field: "acl",
        headerName: "ACL",
        flex: 2,
        minWidth: 300,
        renderCell: (params: { row: UserACL }) => {
          const preset = findPresetByAcl(params.row.acl);
          if (preset !== "custom") {
            const label = ACL_PRESETS.find((p) => p.key === preset)?.label;
            return (
              <Tooltip title={params.row.acl}>
                <Text ellipsis>{label}</Text>
              </Tooltip>
            );
          }
          return (
            <Tooltip title={params.row.acl}>
              <Text ellipsis>{params.row.acl}</Text>
            </Tooltip>
          );
        },
      },
    ];

    if (canWrite) {
      cols.push({
        field: "actions",
        headerName: "Actions",
        flex: 0.5,
        minWidth: 120,
        sortable: false,
        renderCell: (params: { row: UserACL }) => (
          <Stack direction="row" gap="4px">
            <Tooltip title="Edit user">
              <span>
                <IconButton
                  size="small"
                  disabled={status !== "RUNNING" || isMutating}
                  onClick={() => openAddEditDialog("edit", params.row)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                params.row.username === defaultUsername ? "Cannot delete the default instance user" : "Delete user"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={status !== "RUNNING" || isMutating || params.row.username === defaultUsername}
                  onClick={() => setDialog({ open: true, type: "delete", user: params.row })}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      } as any);
    }

    return cols;
  }, [status, isMutating, canWrite, defaultUsername]);

  const closeDialog = () => {
    setDialog({ open: false });
  };

  return (
    <>
      <Box mt="32px" display="flex" flexDirection="column" gap="32px">
        <DataGrid
          getRowId={(row: UserACL) => row.username}
          columns={columns}
          rows={isRefetching ? [] : usersData}
          components={{
            Header: UsersTableHeader,
          }}
          componentsProps={{
            header: {
              count: usersData?.length,
              refetch,
              isRefetching,
              isMutating,
              onAddUser: () => openAddEditDialog("add"),
              status,
              canWrite,
            },
          }}
          sx={{
            borderRadius: "8px",
          }}
          loading={isRefetching || isLoading}
          noRowsText="No users"
        />
      </Box>

      {/* Add / Edit User Dialog */}
      <InformationDialogTopCenter
        handleClose={closeDialog}
        open={dialog.open && (dialog.type === "add" || dialog.type === "edit")}
        PaperProps={{
          component: "form",
          onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries()) as Record<string, string>;
            const acl = getResolvedAcl();

            if (!acl) {
              snackbar.showError("Please provide a valid ACL");
              return;
            }

            if (selectedPreset === "custom" && customCommands.length === 0) {
              snackbar.showError("Please select at least one command");
              return;
            }

            if (selectedPreset === "custom") {
              const invalid = validateAclCommands(customCommands);
              if (invalid.length > 0) {
                snackbar.showError(
                  `Invalid command${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}. Commands must match an allowed command or be a valid subcommand (e.g. +CLIENT|LIST).`
                );
                return;
              }
            }

            if (dialog.type === "add") {
              await createMutation.mutateAsync({
                username: formJson.username,
                password: formJson.password,
                acl,
              });
            } else if (dialog.type === "edit" && dialog.user) {
              const updateData: { username: string; password?: string; acl?: string } = {
                username: dialog.user.username,
                acl,
              };
              if (formJson.password) updateData.password = formJson.password;
              await updateMutation.mutateAsync(updateData);
            }
            closeDialog();
          },
        }}
      >
        <DialogHeader>
          <Box>
            <Text size="large" weight="bold">
              {dialog.type === "add" ? "Add User" : "Edit User"}
            </Text>
          </Box>
        </DialogHeader>
        <DialogContent>
          <Box>
            <Text size="small" weight="regular" color="#344054">
              {dialog.type === "add"
                ? "Create a new user with access to your FalkorDB instance"
                : `Update user "${dialog.user?.username}"`}
            </Text>
            <FieldContainer>
              <FieldLabel required={dialog.type === "add"}>Username</FieldLabel>
              <TextField
                autoFocus
                required={dialog.type === "add"}
                id="username"
                name="username"
                placeholder="username"
                fullWidth
                sx={{ mt: 0 }}
                defaultValue={dialog.user?.username ?? ""}
                disabled={dialog.type === "edit"}
                inputProps={{ minLength: 3 }}
              />
            </FieldContainer>
            <FieldContainer>
              <FieldLabel required={dialog.type === "add"}>Password</FieldLabel>
              <PasswordField
                required={dialog.type === "add"}
                id="password"
                name="password"
                placeholder={dialog.type === "edit" ? "leave blank to keep current" : "password"}
                fullWidth
                sx={{ mt: 0 }}
                inputProps={{ minLength: 6 }}
              />
            </FieldContainer>
            <FieldContainer>
              <Stack direction="row" alignItems="center" gap="4px">
                <FieldLabel required>Role</FieldLabel>
                <Tooltip title="Select a preset role or choose Custom to configure key patterns and commands individually">
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: "#98A2B3", cursor: "help" }} />
                </Tooltip>
              </Stack>
              <Select
                id="acl-preset"
                value={selectedPreset}
                onChange={(e) => {
                  setSelectedPreset(e.target.value as ACLPresetKey);
                  if (e.target.value !== "custom") {
                    setCustomKeys("~*");
                    setCustomCommands([]);
                  }
                }}
                fullWidth
              >
                {ACL_PRESETS.map((preset) => (
                  <MenuItem key={preset.key} value={preset.key}>
                    {preset.label}
                  </MenuItem>
                ))}
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FieldContainer>
            {selectedPreset === "custom" && (
              <>
                <FieldContainer>
                  <Stack direction="row" alignItems="center" gap="4px">
                    <FieldLabel required>Key Patterns</FieldLabel>
                    <Tooltip title="Define which keys this user can access (e.g. ~* for all keys)">
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: "#98A2B3", cursor: "help" }} />
                    </Tooltip>
                  </Stack>
                  <TextField
                    required
                    id="custom-keys"
                    placeholder="~*"
                    fullWidth
                    sx={{ mt: 0 }}
                    value={customKeys}
                    onChange={(e) => setCustomKeys(e.target.value)}
                  />
                </FieldContainer>
                <FieldContainer>
                  <Stack direction="row" alignItems="center" gap="4px">
                    <FieldLabel required>Commands</FieldLabel>
                    <Tooltip title="Select commands from the list or type custom subcommands (e.g. +CLIENT|LIST)">
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: "#98A2B3", cursor: "help" }} />
                    </Tooltip>
                  </Stack>
                  <Autocomplete
                    multiple
                    freeSolo
                    id="custom-commands"
                    options={ALLOWED_ACL_COMMANDS}
                    value={customCommands}
                    onChange={(_: unknown, newValue: string[]) => setCustomCommands(newValue)}
                    filterSelectedOptions
                    placeholder="Type or select commands..."
                    sx={{ "& .MuiOutlinedInput-root": { maxHeight: 200, overflowY: "auto" } }}
                  />
                </FieldContainer>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogFooter>
          <Button variant="outlined" onClick={closeDialog} disabled={isMutating}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={isMutating}>
            {dialog.type === "add" ? "Create" : "Update"}
          </Button>
        </DialogFooter>
      </InformationDialogTopCenter>

      {/* Delete User Confirmation Dialog */}
      <InformationDialogTopCenter handleClose={closeDialog} open={dialog.open && dialog.type === "delete"}>
        <DialogHeader>
          <Box>
            <Text size="large" weight="bold">
              Delete User
            </Text>
          </Box>
        </DialogHeader>
        <DialogContent>
          <Box>
            <Text size="small" weight="regular" color="#344054">
              Are you sure you want to delete user <strong>{dialog.user?.username}</strong>? This action cannot be
              undone.
            </Text>
          </Box>
        </DialogContent>
        <DialogFooter>
          <Button variant="outlined" onClick={closeDialog} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              if (dialog.user) {
                await deleteMutation.mutateAsync(dialog.user.username);
                closeDialog();
              }
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </InformationDialogTopCenter>
    </>
  );
}

export default ResourceUserAccess;
