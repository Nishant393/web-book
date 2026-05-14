import React from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";

export default function SubmitFeedbackModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Feedback" size="sm">
      Feedback form is not enabled in this Login + Dashboard version.
    </Modal>
  );
}

SubmitFeedbackModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
};
