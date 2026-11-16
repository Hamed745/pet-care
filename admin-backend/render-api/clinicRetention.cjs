"use strict";

const DAY_MS = 24 * 60 * 60 * 1000;

const CLINIC_DOCUMENT_RETENTION = Object.freeze({
  draftDays: 30,
  changesRequestedDays: 60,
  rejectedDays: 30,
  appealWindowDays: 14,
  closedDays: 90,
  activeNecessityReviewDays: 365,
  auditLogDays: 365,
});

function timestampMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  return NaN;
}

function clinicDocumentNecessityReview(clinic, now = Date.now()) {
  if (!clinic || !["approved", "suspended"].includes(clinic.status)) {
    return { due: false, reason: "not_active" };
  }
  const anchor = clinic.documentNecessityReviewedAt || clinic.approvedAt ||
    clinic.reviewedAt || clinic.submittedAt || clinic.createdAt;
  const anchorMillis = timestampMillis(anchor);
  if (!Number.isFinite(anchorMillis)) {
    return { due: true, reason: "missing_review_timestamp", dueAt: null };
  }
  const dueAtMillis = anchorMillis + CLINIC_DOCUMENT_RETENTION.activeNecessityReviewDays * DAY_MS;
  return {
    due: now >= dueAtMillis,
    reason: now >= dueAtMillis ? "necessity_review_due" : "necessity_review_current",
    dueAt: new Date(dueAtMillis).toISOString(),
  };
}

function clinicDocumentRetention(clinic, now = Date.now()) {
  if (!clinic || typeof clinic !== "object") return { eligible: false, reason: "missing_application" };
  if (clinic.retentionHold?.active === true || clinic.legalRetentionHold === true) {
    return { eligible: false, reason: "retention_hold" };
  }
  if (clinic.activeReview === true || clinic.activeAppeal === true ||
      clinic.appeal?.status === "pending") {
    return { eligible: false, reason: "active_review_or_appeal" };
  }

  let anchor;
  let retentionDays;
  switch (clinic.status) {
    case "draft":
      anchor = clinic.lastActivityAt || clinic.updatedAt;
      retentionDays = CLINIC_DOCUMENT_RETENTION.draftDays;
      break;
    case "changes_requested":
      anchor = clinic.lastActivityAt || clinic.updatedAt;
      retentionDays = CLINIC_DOCUMENT_RETENTION.changesRequestedDays;
      break;
    case "rejected":
      anchor = clinic.rejectedAt || clinic.reviewedAt;
      retentionDays = CLINIC_DOCUMENT_RETENTION.rejectedDays;
      break;
    case "closed":
      anchor = clinic.closedAt;
      retentionDays = CLINIC_DOCUMENT_RETENTION.closedDays;
      break;
    case "terminated":
      anchor = clinic.terminatedAt || clinic.closedAt;
      retentionDays = CLINIC_DOCUMENT_RETENTION.closedDays;
      break;
    default:
      return { eligible: false, reason: "active_or_unhandled_status" };
  }

  const anchorMillis = timestampMillis(anchor);
  if (!Number.isFinite(anchorMillis)) return { eligible: false, reason: "missing_activity_timestamp" };
  const expiresAt = anchorMillis + retentionDays * DAY_MS;
  return {
    eligible: now >= expiresAt,
    reason: now >= expiresAt ? "retention_expired" : "retention_period_active",
    expiresAt: new Date(expiresAt).toISOString(),
    retentionDays,
  };
}

module.exports = {
  CLINIC_DOCUMENT_RETENTION,
  clinicDocumentNecessityReview,
  clinicDocumentRetention,
};
