"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CLINIC_DOCUMENT_RETENTION,
  clinicDocumentNecessityReview,
  clinicDocumentRetention,
} = require("../clinicRetention.cjs");

const day = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-11-16T00:00:00.000Z");

test("clinic document retention uses the approved inactivity and closure periods", () => {
  assert.equal(CLINIC_DOCUMENT_RETENTION.draftDays, 30);
  assert.equal(CLINIC_DOCUMENT_RETENTION.changesRequestedDays, 60);
  assert.equal(CLINIC_DOCUMENT_RETENTION.rejectedDays, 30);
  assert.equal(CLINIC_DOCUMENT_RETENTION.appealWindowDays, 14);
  assert.equal(CLINIC_DOCUMENT_RETENTION.closedDays, 90);
  assert.equal(CLINIC_DOCUMENT_RETENTION.auditLogDays, 365);

  assert.equal(clinicDocumentRetention({
    status: "draft", lastActivityAt: new Date(now - 30 * day),
  }, now).eligible, true);
  assert.equal(clinicDocumentRetention({
    status: "changes_requested", lastActivityAt: new Date(now - 59 * day),
  }, now).eligible, false);
  assert.equal(clinicDocumentRetention({
    status: "rejected", rejectedAt: new Date(now - 30 * day),
  }, now).eligible, true);
  assert.equal(clinicDocumentRetention({
    status: "closed", closedAt: new Date(now - 89 * day),
  }, now).eligible, false);
});

test("clinic retention fails closed for active records, holds, appeals and unknown timestamps", () => {
  assert.equal(clinicDocumentRetention({ status: "approved" }, now).eligible, false);
  assert.equal(clinicDocumentRetention({ status: "draft" }, now).reason, "missing_activity_timestamp");
  assert.equal(clinicDocumentRetention({
    status: "rejected", rejectedAt: new Date(now - 90 * day),
    retentionHold: { active: true, type: "legal" },
  }, now).reason, "retention_hold");
  assert.equal(clinicDocumentRetention({
    status: "rejected", rejectedAt: new Date(now - 90 * day),
    appeal: { status: "pending" },
  }, now).reason, "active_review_or_appeal");
  assert.equal(clinicDocumentRetention({
    status: "changes_requested", updatedAt: new Date(now - 90 * day), activeReview: true,
  }, now).eligible, false);
});

test("approved and suspended clinic documents require annual necessity review without auto-expiry", () => {
  const year = CLINIC_DOCUMENT_RETENTION.activeNecessityReviewDays;
  assert.equal(year, 365);
  assert.equal(clinicDocumentNecessityReview({
    status: "approved", reviewedAt: new Date(now - (year - 1) * day),
  }, now).due, false);
  const due = clinicDocumentNecessityReview({
    status: "suspended", documentNecessityReviewedAt: new Date(now - year * day),
    reviewedAt: new Date(now - 2 * year * day),
  }, now);
  assert.equal(due.due, true);
  assert.equal(due.reason, "necessity_review_due");
  assert.equal(due.dueAt, new Date(now).toISOString());
  assert.equal(clinicDocumentNecessityReview({ status: "approved" }, now).reason,
    "missing_review_timestamp");
  assert.equal(clinicDocumentNecessityReview({ status: "closed" }, now).due, false);
  assert.equal(clinicDocumentRetention({
    status: "approved", reviewedAt: new Date(now - 10 * year * day),
  }, now).eligible, false);
});
