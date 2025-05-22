import { FC, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import { DialogTitle, Dialog, Stack, DialogContent, DialogContentText, DialogActions, Box } from "@mui/material";
import { UseMutationResult } from "@tanstack/react-query";

import Button from "src/components/Button/Button";
import LoadingSpinnerSmall from "src/components/CircularProgress/CircularProgress";
import DataGridHeaderTitle from "src/components/Headers/DataGridHeaderTitle";
import RefreshWithToolTip from "src/components/RefreshWithTooltip/RefreshWithToolTip";
import ExportIcon from "src/components/Icons/Export/ExportIcon";
import InformationDialogTopCenter, { DialogFooter, DialogHeader } from "src/components/Dialog/InformationDialogTopCenter";
import { Text } from "src/components/Typography/Typography";
import TextField from "src/components/FormElementsv2/TextField/TextField";
import { PasswordField } from "src/components/FormElementsv2/PasswordField/PasswordField";
import FieldContainer from "src/components/FormElements/FieldContainer/FieldContainer";
import FieldLabel from "src/components/FormElements/FieldLabel/FieldLabel";

type TasksTableHeaderProps = {
  count: number;
  refetch: () => void;
  isRefetching: boolean;
  exportMutation: UseMutationResult<void, Error, { username: string, password: string }, unknown>;
};

const TasksTableHeader: FC<TasksTableHeaderProps> = ({
  count,
  refetch,
  isRefetching,
  exportMutation,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        p="20px"
        borderBottom="1px solid #EAECF0"
      >
        <DataGridHeaderTitle
          title={`List of tasks`}
          desc="Import and export RDBs to/from your FalkorDB instance"
          count={count}
          units={{
            singular: "Task",
            plural: "Tasks",
          }}
        />
        <Stack direction="row" alignItems="center" gap="12px" justifyContent="flex-end" flexGrow={1} flexWrap={"wrap"}>
          <RefreshWithToolTip refetch={refetch} disabled={isRefetching} />
          <Button
            variant="outlined"
            sx={{
              height: "40px !important",
              padding: "10px 14px !important",
            }}
            startIcon={<ExportIcon disabled={isRefetching || exportMutation.isLoading} />}
            disabled={isRefetching || exportMutation.isLoading}
            onClick={() => setOpen(true)}
          >
            Export RDB
            {exportMutation.isLoading && <LoadingSpinnerSmall sx={{ color: "#7F56D9", marginLeft: "12px" }} />}
          </Button>
        </Stack>
      </Stack>

      <InformationDialogTopCenter
        handleClose={() => setOpen(false)}
        open={open}
        PaperProps={{
          component: 'form',
          onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries((formData as any).entries());
            await exportMutation.mutateAsync({
              username: formJson.username,
              password: formJson.password
            })
            refetch()
            setOpen(false)
          },
        }}
      >
        <DialogHeader>
          <Box>
            <Text size="large" weight="bold">
              Enter the instance's username and password
            </Text>
          </Box>
        </DialogHeader>
        <DialogContent>
          <Box>

            <Text size="small" weight="regular" color="344054">To export your RDB, you must enter again the username and password with read/write access to your FalkorDB Instance
            </Text>
            <FieldContainer>
              <FieldLabel required>Username</FieldLabel>
              <TextField
                autoFocus
                required
                id="username"
                name="username"
                placeholder='falkordb'
                fullWidth
                sx={{ mt: 0 }}
              />
            </FieldContainer>
            <FieldContainer>
              <FieldLabel required>Password</FieldLabel>
              <PasswordField
                required
                id="password"
                name="password"
                placeholder='your password'
                fullWidth
                sx={{ mt: 0 }}
              />
            </FieldContainer>
          </Box>
        </DialogContent>
        <DialogFooter>
          <Button variant="outlined" onClick={() => setOpen(false)} disabled={exportMutation.isLoading}>Cancel</Button>
          <Button variant="contained" type="submit" disabled={exportMutation.isLoading}>Export</Button>
        </DialogFooter>
      </InformationDialogTopCenter >
    </>
  );
};

export default TasksTableHeader;
