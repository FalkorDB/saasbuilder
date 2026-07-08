import { FC, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Dialog as MuiDialog,
  DialogActions as MuiDialogActions,
  DialogContent as MuiDialogContent,
  DialogTitle as MuiDialogTitle,
  FormControlLabel,
  IconButton,
  RadioGroup,
  Stack,
  styled,
} from "@mui/material";

import LoadingSpinnerSmall from "src/components/CircularProgress/CircularProgress";
import Radio from "src/components/FormElementsv2/Radio/Radio";
import TextField from "src/components/FormElementsv2/TextField/TextField";
import DeleteCircleIcon from "src/components/Icons/DeleteCircle/DeleteCircleIcon";
import { Text } from "src/components/Typography/Typography";
import Button from "components/Button/Button";

const Dialog = styled(MuiDialog)(() => ({
  [`& .MuiPaper-root`]: {
    width: "100%",
    maxWidth: "521px",
    padding: "24px",
  },
}));

const DialogTitle = styled(MuiDialogTitle)(() => ({
  padding: 0,
}));

const DialogContent = styled(MuiDialogContent)(() => ({
  padding: 0,
}));

const DialogActions = styled(MuiDialogActions)(() => ({
  padding: 0,
  paddingTop: 24,
}));

const StyledFormControlLabel = styled(FormControlLabel)(() => ({
  alignItems: "flex-start",
  margin: 0,
  paddingTop: "8px",
  paddingBottom: "8px",
  borderBottom: "1px solid #EAECF0",
  width: "100%",
  "&:first-of-type": {
    borderTop: "1px solid #EAECF0",
  },
  "& .MuiRadio-root": {
    padding: "0 8px 0 0",
    paddingTop: "2px",
  },
}));

export const DELETION_REASONS = [
  {
    value: "recreate",
    label: "I will recreate a new one",
    description: "Just cleaning up or starting fresh. Not really leaving.",
  },
  {
    value: "costs",
    label: "Costs are too high",
    description: "The price does not fit the budget or the value at this stage.",
  },
  {
    value: "stability",
    label: "Stability or reliability issues",
    description: "Ran into downtime, errors, or performance that did not meet expectations.",
  },
  {
    value: "missing_feature",
    label: "Missing a feature I need",
    description: "A capability or integration I needed was not available.",
  },
  {
    value: "better_solution",
    label: "Found a better solution",
    description: "Another tool fit my needs better. We would love to know which one.",
  },
  {
    value: "other",
    label: "Other",
    description: "",
  },
] as const;

export type DeletionReasonValue = (typeof DELETION_REASONS)[number]["value"];

type DeletionReasonDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  instanceId?: string;
  isLoading?: boolean;
};

const DeletionReasonDialog: FC<DeletionReasonDialogProps> = ({
  open,
  onClose,
  onConfirm,
  instanceId,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<DeletionReasonValue | "">("");
  const [otherText, setOtherText] = useState("");

  const isOtherSelected = selectedReason === "other";
  const isConfirmDisabled = !selectedReason || (isOtherSelected && !otherText.trim()) || isLoading;

  const handleClose = () => {
    setSelectedReason("");
    setOtherText("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedReason) return;
    if (isOtherSelected && !otherText.trim()) return;
    const resolvedReason = isOtherSelected ? otherText.trim() : selectedReason;
    await onConfirm(resolvedReason);
    setSelectedReason("");
    setOtherText("");
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap="16px">
            <DeleteCircleIcon />
            <Text size="large" weight="bold">
              Before you delete, help us improve
            </Text>
          </Stack>
          <IconButton onClick={handleClose} aria-label="Close deletion reason dialog" sx={{ alignSelf: "flex-start" }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Text size="medium" weight="semibold" sx={{ marginTop: "20px", marginBottom: "4px" }}>
          Why are you deleting{instanceId ? ` - ${instanceId}` : " this instance"}?
        </Text>

        <RadioGroup
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value as DeletionReasonValue)}
        >
          {DELETION_REASONS.map((reason) => (
            <StyledFormControlLabel
              key={reason.value}
              value={reason.value}
              control={<Radio />}
              label={
                <Stack width="100%">
                  <Text size="small" weight="semibold" color="#344054">
                    {reason.label}
                  </Text>
                  {reason.description && (
                    <Text size="small" weight="regular" color="#667085">
                      {reason.description}
                    </Text>
                  )}
                  {reason.value === "other" && isOtherSelected && (
                    <TextField
                      placeholder="Please specify your reason"
                      value={otherText}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherText(e.target.value)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      inputProps={{ maxLength: 500 }}
                      multiline
                      minRows={2}
                      sx={{ marginTop: "8px" }}
                      data-testid="deletion-reason-other-input"
                    />
                  )}
                </Stack>
              }
            />
          ))}
        </RadioGroup>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" size="large" disabled={isLoading} onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="large"
          variant="contained"
          disabled={isConfirmDisabled}
          bgColor="#D92D20"
          fontColor="#FFFFFF"
          onClick={handleConfirm}
          data-testid="deletion-reason-confirm-button"
        >
          Next {isLoading && <LoadingSpinnerSmall />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeletionReasonDialog;
