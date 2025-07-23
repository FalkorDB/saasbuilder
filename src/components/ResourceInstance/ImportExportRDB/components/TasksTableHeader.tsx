import { FC, useState } from "react";
import { Stack, DialogContent, Box } from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { UseMutationResult } from "@tanstack/react-query";

import Button from "src/components/Button/Button";
import LoadingSpinnerSmall from "src/components/CircularProgress/CircularProgress";
import DataGridHeaderTitle from "src/components/Headers/DataGridHeaderTitle";
import RefreshWithToolTip from "src/components/RefreshWithTooltip/RefreshWithToolTip";
import ExportIcon from "src/components/Icons/Export/ExportIcon";
import InformationDialogTopCenter, {
  DialogFooter,
  DialogHeader,
} from "src/components/Dialog/InformationDialogTopCenter";
import { Text } from "src/components/Typography/Typography";
import TextField from "src/components/FormElementsv2/TextField/TextField";
import { PasswordField } from "src/components/FormElementsv2/PasswordField/PasswordField";
import FieldContainer from "src/components/FormElements/FieldContainer/FieldContainer";
import FieldLabel from "src/components/FormElements/FieldLabel/FieldLabel";
import Tooltip from "src/components/Tooltip/Tooltip";
import ImportIcon from "src/components/Icons/Import/ImportIcon";
import useSnackbar from "src/hooks/useSnackbar";

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

type TasksTableHeaderProps = {
  count: number;
  refetch: () => void;
  isRefetching: boolean;
  exportMutation: UseMutationResult<void, Error, { username: string; password: string }, unknown>;
  importMutation: UseMutationResult<void, Error, { username: string, password: string, file: ArrayBuffer }, unknown>;
  status: string;
};

const TasksTableHeader: FC<TasksTableHeaderProps> = ({ count, refetch, isRefetching, exportMutation, importMutation, status }) => {
  const snackbar = useSnackbar();
  const [dialog, setDialog] = useState<{ open: boolean, type?: 'export' | 'import' }>({ open: false, type: 'export' });

  const [file, setFile] = useState<File | undefined>();

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
          <Tooltip placement="top" visible={status !== "RUNNING"} title='The instance must be running to import an RDB'>
            <span>
              <Button
                variant="outlined"
                sx={{
                  height: "40px !important",
                  padding: "10px 14px !important",
                }}
                startIcon={<ImportIcon disabled={status != "RUNNING" || isRefetching || importMutation.isPending || exportMutation.isPending} />}
                disabled={status != "RUNNING" || isRefetching || importMutation.isPending || exportMutation.isPending}
                onClick={() => setDialog({ open: true, type: "import" })}
              >
                Import RDB
                {(importMutation.isPending || exportMutation.isPending) && <LoadingSpinnerSmall sx={{ color: "#7F56D9", marginLeft: "12px" }} />}
              </Button>
            </span>
          </Tooltip>
          <Tooltip placement="top" visible={status !== "RUNNING"} title='The instance must be running to export the RDB'>
            <span>
              <Button
                variant="outlined"
                sx={{
                  height: "40px !important",
                  padding: "10px 14px !important",
                }}
                startIcon={<ExportIcon disabled={status != "RUNNING" || isRefetching || exportMutation.isPending || importMutation.isPending} />}
                disabled={status != "RUNNING" || isRefetching || exportMutation.isPending || importMutation.isPending}
                onClick={() => setDialog({ open: true, type: "export" })}
              >
                Export RDB
                {(exportMutation.isPending || importMutation.isPending) && <LoadingSpinnerSmall sx={{ color: "#7F56D9", marginLeft: "12px" }} />}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <InformationDialogTopCenter
        handleClose={() => { setDialog({ open: false }); setFile(undefined) }}
        open={dialog.open}
        PaperProps={{
          component: "form",
          onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries((formData as any).entries());

            if (dialog.type === "import") {

              if (!file) {
                snackbar.showError(`Please select a valid RDB file`);
                return;
              }
              await importMutation.mutateAsync({
                username: formJson.username,
                password: formJson.password,
                file: await file.arrayBuffer(),
              })
            } else {
              await exportMutation.mutateAsync({
                username: formJson.username,
                password: formJson.password,
              });
            }
            refetch();
            setDialog({ open: false });
            setFile(undefined)
          },
        }}
      >
        <DialogHeader>
          <Box>
            <Text size="large" weight="bold">
              Enter the instance&apos;s username and password
            </Text>
          </Box>
        </DialogHeader>
        <DialogContent>
          <Box>
            <Text size="small" weight="regular" color="#344054">
              To {dialog.type} your RDB, you must enter again the username and password with read/write access to your FalkorDB
              Instance
            </Text>
            {
              dialog.type === 'import' && (
                <Text size="small" weight="semibold" color="#EF4444">
                  Caution: Your instance will be erased before the import takes place.
                </Text>
              )
            }
            <FieldContainer>
              <FieldLabel required>Username</FieldLabel>
              <TextField
                autoFocus
                required
                id="username"
                name="username"
                placeholder="falkordb"
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
                placeholder="your password"
                fullWidth
                sx={{ mt: 0 }}
              />
            </FieldContainer>
            {
              dialog.type === "import" && (
                <FieldContainer>
                  <Stack
                    spacing={{ xs: 2 }}
                    direction="row"
                    useFlexGap
                    sx={{ flexWrap: 'nowrap' }}
                    alignItems="center"
                  >
                    <Button
                      component="label"
                      role={undefined}
                      variant="contained"
                      tabIndex={-1}
                      startIcon={<CloudUploadIcon />}
                    >
                      Select RDB file
                      <VisuallyHiddenInput
                        type="file"
                        accept=".rdb"
                        onChange={(event) => {
                          setFile(event?.target?.files?.[0])
                        }}
                      />
                    </Button>
                    {
                      file && (
                        <Text ellipsis={true} maxWidth="275px">{file.name}</Text>
                      )
                    }
                  </Stack>
                </FieldContainer>
              )
            }
          </Box>
        </DialogContent>
        <DialogFooter>
          <Button variant="outlined" onClick={() => { setDialog({ open: false }); setFile(undefined) }} disabled={exportMutation.isPending || importMutation.isPending}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={exportMutation.isPending || importMutation.isPending}>
            {dialog.type === 'export' ? 'Export' : 'Import'}
          </Button>
        </DialogFooter>
      </InformationDialogTopCenter>
    </>
  );
};

export default TasksTableHeader;
