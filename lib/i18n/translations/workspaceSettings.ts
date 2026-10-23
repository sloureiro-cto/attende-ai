// Function-based translation types
type TranslationFunction = (...args: unknown[]) => string

export type WorkspaceSettingsTranslationValue = string | TranslationFunction

export type WorkspaceSettingsTranslationKey =
  | "workspaceName"
  | "companyName"
  | "companyWebsite"
  | "domain"
  | "workspaceNamespace"
  | "workspaceNamespaceHint"
  | "workspaceNamespacePlaceholder"
  | "workspaceNamespaceInvalid"
  | "workspaceNamespaceReserved"
  | "workspaceNamespaceTaken"
  | "workspaceOwner"
  | "description"
  | "cancel"
  | "save"
  | "workspaceNameRequired"
  | "workspaceDetailsUpdated"
  | "businessHoursTitle"
  | "businessHoursDescription"
  | "businessHoursEnabled"
  | "businessHoursTimezone"
  | "businessHoursAddWindow"
  | "businessHoursRemoveWindow"
  | "businessHoursStart"
  | "businessHoursEnd"
  | "businessHoursSaved"
  | "businessHoursMonday"
  | "businessHoursTuesday"
  | "businessHoursWednesday"
  | "businessHoursThursday"
  | "businessHoursFriday"
  | "businessHoursSaturday"
  | "businessHoursSunday"
  | "whatsappLiteRuleTemplatesWhenWithinBusinessHours"
  | "whatsappLiteRuleTemplatesWhenOutsideBusinessHours"
  | "whatsappLiteRuleTemplatesWhenChatType"
  | "whatsappLiteRuleTemplatesDirectOnlyHint"
  | "whatsappLiteRuleTemplatesWhenChatTypeDirect"
  | "whatsappLiteRuleTemplatesWhenChatTypeGroup"
  | "whatsappLiteRuleTemplatesWhenChatTypeAny"
  | "whatsappLiteRuleTemplatesWhenChatTypeHint"
  | "whatsappLiteRuleTemplatesWhenChatTypeDisabled"
  | "whatsappLiteRuleTemplatesWhenFromGroup"
  | "whatsappLiteRuleTemplatesWhenFromGroupMode"
  | "whatsappLiteRuleTemplatesWhenFromGroupLabel"
  | "whatsappLiteRuleTemplatesWhenFromGroupHint"
  | "whatsappLiteRuleTemplatesWhenFromPhone"
  | "whatsappLiteRuleTemplatesWhenFromPhoneMode"
  | "whatsappLiteRuleTemplatesWhenFromPhoneLabel"
  | "whatsappLiteRuleTemplatesWhenFromPhoneHint"
  | "whatsappLiteRuleTemplatesWhenFromAd"
  | "whatsappLiteRuleTemplatesWhenFromAdHint"
  | "whatsappLiteRuleTemplatesWhenFromAdMatch"
  | "whatsappLiteRuleTemplatesWhenFromAdAny"
  | "whatsappLiteRuleTemplatesWhenFromAdIds"
  | "whatsappLiteRuleTemplatesWhenFromAdCampaigns"
  | "whatsappLiteRuleTemplatesWhenFromAdCampaignsHint"
  | "whatsappLiteRuleTemplatesWhenFromAdHeadline"
  | "whatsappLiteRuleTemplatesWhenFromAdScope"
  | "whatsappLiteRuleTemplatesWhenFromAdScopeMessage"
  | "whatsappLiteRuleTemplatesWhenFromAdScopeConversation"
  | "whatsappLiteRuleTemplatesAdTokensHint"
  | "whatsappLiteRuleTemplatesWhenModeIn"
  | "whatsappLiteRuleTemplatesWhenModeNotIn"
  | "whatsappLiteRuleTemplatesActionSendToRecipients"
  | "whatsappLiteRuleTemplatesRecipients"
  | "whatsappLiteRuleTemplatesRecipientAssignee"
  | "whatsappLiteRuleTemplatesRecipientReporter"
  | "whatsappLiteRuleTemplatesRecipientCardHint"
  | "whatsappLiteRuleTemplatesRecipientUsers"
  | "whatsappLiteRuleTemplatesRecipientUsersPlaceholder"
  | "whatsappLiteRuleTemplatesRecipientUsersSearch"
  | "whatsappLiteRuleTemplatesRecipientCustomPhones"
  | "whatsappLiteRuleTemplatesRecipientGroups"
  | "whatsappLiteRuleTemplatesRecipientGroupsHint"
  | "whatsappLiteBindingAllowGroupAutoReply"
  | "whatsappLiteBindingAllowGroupAutoReplyHint"
  | "whatsappLiteBindingAllowGroupAll"
  | "whatsappLiteBindingAllowGroupPick"
  | "whatsappLiteBindingGroupsEmpty"
  | "whatsappLiteBindingGroupsDisabled"
  | "whatsappLiteBindingGroupsLoading"
  | "whatsappLiteBindingGroupsPickRequired"
  | "whatsappLiteRuleTemplatesSimChatType"
  | "whatsappLiteInboxHideGroupsAutomationHint"
  | "whatsappLiteRuleTemplatesWhenLinkedCard"
  | "whatsappLiteRuleTemplatesWhenNewLead"
  | "whatsappLiteRuleTemplatesWhenNewLeadFunnel"
  | "whatsappLiteRuleTemplatesNewLeadScope"
  | "whatsappLiteRuleTemplatesNewLeadScopeWorkspace"
  | "whatsappLiteRuleTemplatesNewLeadScopeFunnel"
  | "whatsappLiteRuleTemplatesNewLeadWorkspaceHint"
  | "whatsappLiteRuleTemplatesNewLeadFunnelHint"
  | "whatsappLiteRuleTemplatesLinkedCardHint"
  | "whatsappLiteRuleTemplatesLinkedCardRow"
  | "whatsappLiteRuleTemplatesAnyColumn"
  | "whatsappLiteRuleTemplatesAddLinkedCardOr"
  | "whatsappLiteRuleTemplatesConditionsMatch"
  | "whatsappLiteRuleTemplatesMatchAll"
  | "whatsappLiteRuleTemplatesMatchAny"
  | "whatsappLiteOutboundSourceText"
  | "whatsappLiteOutboundSourceShortcut"
  | "whatsappLiteOutboundSourceMeta"
  | "whatsappLiteOutboundPickTemplate"
  | "whatsappLiteOutboundTextPlaceholder"
  | "whatsappLiteOutboundTextOptional"
  | "whatsappLiteOutboundTemplateHint"
  | "whatsappLiteFollowupAddMessage"
  | "whatsappLiteFollowupRemoveMessage"
  | "whatsappLiteFollowupMessageN"
  | "whatsappLiteFollowupUseAgentConversationHint"
  | "whatsappLiteFollowupAgentFallbackHint"
  | "whatsappLiteFollowupMessagesOptionalWithAiHint"
  | "whatsappLiteFollowupScheduleFromConversation"
  | "whatsappLiteFollowupScheduleFromConversationHint"
  | "whatsappLiteFollowupDaysBeforeEvent"
  | "whatsappLiteFollowupOnEventDay"
  | "whatsappLiteFollowupEventOffsets"
  | "whatsappLiteFollowupEventOffsetsHint"
  | "whatsappLiteFollowupAddEventOffset"
  | "whatsappLiteRuleTemplatesLinkedCardMode"
  | "whatsappLiteRuleTemplatesLinkedCardModeIn"
  | "whatsappLiteRuleTemplatesLinkedCardModeNotIn"
  | "whatsappLiteRuleTemplatesLinkedCardHintNotIn"
  | "failedToUpdateWorkspace"
  | "dangerZone"
  | "deleteWorkspace"
  | "permanentlyDeleteWorkspace"
  | "changeWorkspaceLogo"
  | "workspaceLogoAlt"
  | "customBrandingTitle"
  | "customBrandingDescription"
  | "customBrandingEnabled"
  | "customBrandingEnabledHint"
  | "customBrandingSidebarColor"
  | "customBrandingSidebarColorHint"
  | "customBrandingUseDefaultColor"
  | "customBrandingColorStyle"
  | "customBrandingColorStyleGradient"
  | "customBrandingColorStyleSolid"
  | "customBrandingLogoHint"
  | "customBrandingSaved"
  | "customBrandingInvalidColor"
  | "createdAt"
  | "confirmAction"
  | "deleteWorkspaceWarning"
  | "deleteWorkspaceConfirmation"
  | "typeDeleteToConfirm"
  | "deleteWorkspaceButton"
  | "backToWorkspace"
  | "billing"
  | "settings"
  | "account"
  | "members"
  | "integrations"
  | "oauthApps"
  | "agentDigestNav"
  | "mcpConnections"
  | "rolesAndPermissions"
  | "planDetails"
  | "activeMembers"
  | "member"
  | "members"
  | "daysLeftInTrial"
  | "day"
  | "days"
  | "currentPlan"
  | "addPaymentMethod"
  | "managePlan"
  | "contactSupportToSwitchPlans"
  | "switchPlan"
  | "switchPlanConfirmTitle"
  | "switchPlanConfirmDescription"
  | "switchPlanSuccess"
  | "switchPlanError"
  | "switching"
  | "confirm"
  | "downgradeInDevelopment"
  | "upgradeTo"
  | "downgradeTo"
  | "startTrial"
  | "oneTrialPerWorkspace"
  | "startTrialModalTitle"
  | "startTrialModalSubtitle"
  | "startTrialModalFeaturesHeading"
  | "startTrialModalFeatureAiIntegration"
  | "startTrialModalFeatureUnlimitedProjects"
  | "startTrialModalFeaturePeoplePerMeeting"
  | "startTrialModalFeaturePrivateTasks"
  | "startTrialModalFeatureUnlimitedRoles"
  | "startTrialModalFeatureMeetingTranscripts"
  | "startTrialModalFeatureJsynqAi"
  | "startTrialModalFeaturePrioritySupport"
  | "startTrialModalFeatureAndMore"
  | "startTrialModalFeatureTimeInsights"
  | "startTrialModalCancel"
  | "startTrialModalViewPlans"
  | "startTrialModalStartFreeTrial"
  | "startTrialModalPaymentTitle"
  | "startTrialModalPaymentSubtitle"
  | "startTrialModalPaymentCardLabel"
  | "startTrialModalBack"
  | "startTrialModalConfirmStartTrial"
  | "startTrialModalSuccessTitle"
  | "startTrialModalSuccessSubtitle"
  | "startTrialModalGotIt"
  | "startTrialModalGenericError"
  | "perUserPerMonth"
  | "perWorkspacePerMonth"
  | "flatRateForTeam"
  | "perUserPerYear"
  | "totalOf"
  | "perMonth"
  | "perYear"
  | "months"
  | "billedAnnually"
  | "billedMonthly"
  | "freePlanMaxSeats"
  | "reviewYourPlan"
  | "myTeamHas"
  | "membersLabel"
  | "choose"
  | "continueButton"
  | "goBack"
  | "back"
  | "whatsappLitePickMetaPixel"
  | "whatsappLiteSendToMetaPixel"
  | "whatsappLiteSendToMetaPixelHint"
  | "whatsappLiteNoMetaPixelIntegrations"
  | "metaPixelIntegration"
  | "metaPixelDefaultEventName"
  | "invitations"
  | "failedInvitations"
  | "addMember"
  | "youCannotAddMoreMembers"
  | "youCanOnlyAddUpTo"
  | "membersWithThe"
  | "plan"
  | "youDontHavePermissionToAddMembers"
  | "user"
  | "emailAddress"
  | "role"
  | "status"
  | "active"
  | "inactive"
  | "you"
  | "removeUser"
  | "disable"
  | "thisUserWillBeRemovedFromAllProjects"
  | "workspaceRole"
  | "dateSent"
  | "dateUpdated"
  | "noInvitationsFound"
  | "noFailedInvitationsFound"
  | "invitationSent"
  | "pendingFor"
  | "days"
  | "cancelInvitation"
  | "invitationCanceled"
  | "invitationExpired"
  | "invitationDeclined"
  | "acceptedInvitedAt"
  | "removedInvitedAt"
  | "rejectedInvitedAt"
  | "expiredInvitedAt"
  | "canceledInvitedAt"
  | "allStatuses"
  | "statusPending"
  | "statusAccepted"
  | "statusExpired"
  | "statusCanceled"
  | "statusRejected"
  | "statusRemoved"
  | "resendInvitation"
  | "removeFromList"
  | "invitationSentSuccessfully"
  | "rolesAndPermissions"
  | "search"
  | "createNewRole"
  | "youCanOnlyCreateUpTo"
  | "customRolesIn"
  | "plan"
  | "noRolesFound"
  | "edit"
  | "delete"
  | "youCanOnlyDeleteCustomRoles"
  | "creatingNewRole"
  | "createNewRole"
  | "saveChanges"
  | "youHaveUnsavedChanges"
  | "saveChanges"
  | "discardChanges"
  | "monthly"
  | "yearly"
  | "quarterly"
  | "semestral"
  | "billedQuarterly"
  | "billedSemestrally"
  | "saveUpToMessage"
  | "onYearlyPlan"
  | "saveUpTo"
  | "noMembers"
  | "noPlan"
  | "upgradeNow"
  | "startedPlan"
  | "trial"
  | "remaining"
  | "youreCurrentlyOnTheFreeForeverPlan"
  | "foreverPlan"
  | "free"
  | "upgradeForMore"
  | "startYourFreeTrialNow"
  | "editingRole"
  | "roleName"
  | "roleNamePlaceholder"
  | "workspace"
  | "projects"
  | "timeTracker"
  | "documents"
  | "create"
  | "update"
  | "fullPermission"
  | "checkAll"
  | "uncheckAll"
  | "rolesUiPeople"
  | "rolesUiPeopleCount"
  | "rolesUiOnePerson"
  | "rolesUiModulesWithAccess"
  | "rolesUiPermissions"
  | "rolesUiAllModules"
  | "rolesUiNoModules"
  | "rolesUiCountOf"
  | "rolesUiModuleOff"
  | "rolesUiFullArea"
  | "rolesUiMarkAll"
  | "rolesUiStandard"
  | "rolesUiCustom"
  | "rolesUiLede"
  | "rolesUiSearchPermissions"
  | "rolesUiOnlyActive"
  | "rolesUiResults"
  | "rolesUiApplyTemplate"
  | "rolesUiTemplateApplied"
  | "rolesUiTplViewer"
  | "rolesUiTplCommenter"
  | "rolesUiTplCollaborator"
  | "rolesUiTplEditor"
  | "rolesUiTplAdmin"
  | "rolesUiNone"
  | "rolesUiReadOnly"
  | "rolesUiAll"
  | "rolesUiActiveOfTotal"
  | "rolesUiRequires"
  | "rolesUiAlsoDisabled"
  | "rolesUiAlsoEnabled"
  | "rolesUiModuleGate"
  | "rolesUiTurnOnAccess"
  | "rolesUiUnsaved"
  | "rolesUiAllSaved"
  | "rolesUiActiveCount"
  | "rolesUiNoMatch"
  | "rolesUiNoActive"
  | "rolesUiVerbRead"
  | "rolesUiVerbCreate"
  | "rolesUiVerbUpdate"
  | "rolesUiVerbDelete"
  | "rolesUiVerbAction"
  | "rolesUiAreas"
  | "roleUpdatedSuccessfully"
  | "loading"
  | "deleteRoleDialogTitle"
  | "deleteRoleDialogConfirmQuestion"
  | "deleteRoleDialogMustReassign"
  | "deleteRoleDialogAssignedToMemberCount"
  | "deleteRoleDialogMembersHeading"
  | "deleteRoleDialogChangeAllToLabel"
  | "deleteRoleDialogSelectNewRole"
  | "deleteRoleDialogDeleting"
  | "deleteRoleDialogDeleteRoleButton"
  | "deleteRoleDialogReassignFailed"
  | "deleteRoleDialogDeleteSuccessWithReassignment"
  | "deleteRoleDialogDeleteSuccessNoMembers"
  | "createNewWorkspace"
  | "noWorkspacesFound"
  | "clientWorkspacesSectionTitle"
  | "clientWorkspaceEnterError"
  | "createWorkspaceDescription"
  | "addImage"
  | "changeImage"
  | "language"
  | "selectLanguage"
  | "createWorkspace"
  | "workspaceSettings"
  | "private"
  | "cardExpiryExpired"
  | "cardExpiryInvalid"
  | "paymentDetails"
  | "addNewCard"
  | "cardInformation"
  | "cardholderName"
  | "cardNumberPlaceholder"
  | "cardExpiryPlaceholder"
  | "cardCvcPlaceholder"
  | "cardholderNamePlaceholder"
  | "cardNumberInvalid"
  | "cardCvcInvalid"
  | "cardholderNameRequired"
  | "failedToCreatePaymentMethod"
  | "failedToCreateWorkspace"
  | "workspaceCreationSuccess"
  | "failedToCreatePaymentMethodOrWorkspace"
  | "endedIn"
  | "expiration"
  | "noSavedPaymentMethods"
  | "deletePaymentMethod"
  | "setDefaultPaymentMethod"
  | "defaultPaymentMethodBadge"
  | "saveCard"
  | "billingPaymentMethods"
  | "billingInvoices"
  | "billingCardsLoadError"
  | "billingInvoicesLoadError"
  | "setDefaultPaymentMethodSuccess"
  | "deletePaymentMethodSuccess"
  | "addPaymentMethodSuccess"
  | "cannotDeleteOnlyPaymentMethod"
  | "noInvoices"
  | "viewInvoice"
  | "downloadInvoice"
  | "billingInvoiceNumber"
  | "billingInvoiceDate"
  | "billingInvoiceAmount"
  | "billingInvoiceStatus"
  | "billingInvoiceActions"
  | "billingViewMore"
  | "billingViewLess"
  | "cardExpiresOn"
  | "cardExpiredOn"
  | "invoiceStatusPaid"
  | "invoiceStatusOpen"
  | "invoiceStatusDraft"
  | "invoiceStatusVoid"
  | "invoiceStatusUncollectible"
  | "invoiceUntitled"
  | "deletePaymentMethodConfirm"
  | "currentSubscription"
  | "currentSubscriptionCustomHint"
  | "choosePaymentMethod"
  | "cardDeclinedFraudulent"
  | "cardDeclinedInsufficientFunds"
  | "cardDeclinedExpired"
  | "cardDeclinedLost"
  | "cardDeclinedStolen"
  | "cardDeclinedGeneric"
  | "paymentFormNotReady"
  | "checkPaymentDetails"
  | "stripeKeyMissing"
  | "failedToCreateSetupIntent"
  | "failedToInitializePaymentForm"
  | "paymentSetupError"
  // Review bill / onboarding
  | "reviewYourBill"
  | "subtotal"
  | "subtotalWithSeats"
  | "addPromotionCode"
  | "promotionCode"
  | "promotionCodePlaceholder"
  | "apply"
  | "discount"
  | "removePromotionCode"
  | "total"
  // Promotion code validation
  | "promotionCodeRequired"
  | "failedToValidatePromotionCode"
  | "promotionCodeNotFoundOrInactive"
  | "promotionCodeNotValidForAccount"
  | "promotionCodeSignInRequired"
  | "promotionCodeExpired"
  | "promotionCodeWrongPlan"
  | "promotionCodeWrongCurrency"
  | "promotionCodeNoPricingForCurrency"
  | "promotionCodeFirstWorkspaceOnly"
  | "promotionCodeFirstTimeSignInRequired"
  // Promotion code success messages (discount applied)
  | "discountSuccessRepeatingPercent"
  | "discountSuccessRepeatingAmount"
  | "discountSuccessOncePercent"
  | "discountSuccessOnceAmount"
  | "discountSuccessForeverPercent"
  | "discountSuccessForeverAmount"
  // Auth pages
  | "welcomeBack"
  | "email"
  | "password"
  | "confirmPassword"
  | "passwordsDoNotMatch"
  | "forgotPassword"
  | "signIn"
  | "or"
  | "continueWithGoogle"
  | "dontHaveAccount"
  | "signUp"
  | "emailOrPasswordInvalid"
  | "somethingWentWrongTryAgain"
  // Sign up page
  | "createAccountInSeconds"
  | "secureYourAccount"
  | "fullName"
  | "next"
  | "alreadyHaveAccount"
  | "byClickingButton"
  | "iAgreeToThe"
  | "termsOfService"
  | "and"
  | "privacyPolicy"
  | "enterValidEmail"
  | "emailAlreadyRegistered"
  // Onboarding page metadata
  | "onboardingPageTitle"
  | "onboardingPageDescription"
  | "onboardingPlanPageTitle"
  | "onboardingPlanPageDescription"
  | "onboardingReviewPageTitle"
  | "onboardingReviewPageDescription"
  | "onboardingPaymentPageTitle"
  | "onboardingPaymentPageDescription"
  | "onboardingPaymentDetailsPageTitle"
  | "onboardingPaymentDetailsPageDescription"
  | "onboardingInviteMembersPageTitle"
  | "onboardingInviteMembersPageDescription"
  // Workspace integrations (Telegram)
  | "integrationPageSubtitle"
  | "integrationAddTelegram"
  | "integrationLoading"
  | "integrationConnectedTitle"
  | "integrationActive"
  | "integrationInactive"
  | "integrationUpdated"
  | "integrationOpen"
  | "integrationConfigure"
  | "integrationGenerateLinkCode"
  | "integrationEmptyTitle"
  | "integrationEmptyBody"
  | "integrationDiscoverTitle"
  | "integrationTelegramCardTitle"
  | "integrationTelegramCardDescription"
  | "clickupWsCardTitle"
  | "clickupWsCardDescription"
  | "clickupWsBtnManage"
  | "clickupWsConnectedStatus"
  | "clickupWsConnectedSubtitle"
  | "clickupWsImportStartedToast"
  | "clickupWsStatus_processing"
  | "clickupWsStatus_queued"
  | "clickupWsStatus_completed"
  | "clickupWsStatus_failed"
  | "clickupWsStatus_idle"
  | "clickupWsModalTitle"
  | "clickupWsModalIntro"
  | "clickupWsAuthentication"
  | "clickupWsAuthenticate"
  | "clickupWsReauth"
  | "clickupWsReauthHint"
  | "clickupWsReauthOptional"
  | "clickupWsAuthenticating"
  | "clickupWsAuthenticated"
  | "clickupWsSelectTeam"
  | "clickupWsChooseTeam"
  | "clickupWsLoadingTeams"
  | "clickupWsSelectSpace"
  | "clickupWsChooseSpace"
  | "clickupWsLoadingSpaces"
  | "clickupWsSelectLists"
  | "clickupWsSelectAll"
  | "clickupWsLoadingLists"
  | "clickupWsNoLists"
  | "clickupWsSelectedCount"
  | "clickupWsImportButton"
  | "clickupWsImporting"
  | "clickupWsResults"
  | "clickupWsDisconnect"
  | "clickupWsAuthFailed"
  | "clickupWsConnectFailed"
  | "clickupWsConnectedToast"
  | "clickupWsImportFailed"
  | "clickupWsImportSuccess"
  | "clickupWsImportPartial"
  | "clickupWsDisconnectFailed"
  | "clickupWsDisconnectedToast"
  | "clickupWsFailedTeams"
  | "clickupWsFailedSpaces"
  | "clickupWsFailedFolders"
  | "clickupWsFailedLists"
  | "rdStationWsCardTitle"
  | "rdStationWsCardDescription"
  | "rdStationWsConnectButton"
  | "rdStationWsConnecting"
  | "rdStationWsConnected"
  | "rdStationWsAttention"
  | "rdStationWsAuthenticating"
  | "rdStationWsAuthFailed"
  | "rdStationWsConnectFailed"
  | "rdStationWsSettingUp"
  | "rdStationWsConnectedToast"
  | "rdStationWsViewProject"
  | "rdStationWsReconnect"
  | "rdStationWsDisconnect"
  | "rdStationWsDisconnecting"
  | "rdStationWsDisconnectFailed"
  | "rdStationWsDisconnectedToast"
  | "rdStationWsDisconnectTitle"
  | "rdStationWsDisconnectDescription"
  | "rdStationWsReconcile"
  | "rdStationWsReconciling"
  | "rdStationWsReconcileQueued"
  | "rdStationWsReconcileFailed"
  | "rdStationWsAlreadyConnectedError"
  | "rdStationWsSelectPipelinesTitle"
  | "rdStationWsSelectPipelinesDescription"
  | "rdStationWsNoPipelinesFound"
  | "rdStationWsPipelineStages"
  | "rdStationWsImportButton"
  | "rdStationWsImporting"
  | "rdStationWsImportFailed"
  | "rdStationWsSelectAtLeastOne"
  | "rdStationWsCancelSelectionConfirmTitle"
  | "rdStationWsCancelSelectionConfirmDescription"
  | "kommoWsCardTitle"
  | "kommoWsCardDescription"
  | "kommoWsConnectButton"
  | "kommoWsConnecting"
  | "kommoWsConnected"
  | "kommoWsAttention"
  | "kommoWsConnectFailed"
  | "kommoWsConnectedToast"
  | "kommoWsImportingToast"
  | "kommoWsReimportedToast"
  | "kommoWsViewProject"
  | "kommoWsReconnect"
  | "kommoWsRetryImport"
  | "kommoWsReimport"
  | "kommoWsImporting"
  | "kommoWsImportFailed"
  | "kommoWsDisconnect"
  | "kommoWsDisconnecting"
  | "kommoWsDisconnectFailed"
  | "kommoWsDisconnectedToast"
  | "kommoWsDisconnectTitle"
  | "kommoWsDisconnectDescription"
  | "kommoWsSubdomainLabel"
  | "kommoWsSubdomainPlaceholder"
  | "kommoWsSubdomainHint"
  | "kommoWsTokenLabel"
  | "kommoWsTokenPlaceholder"
  | "kommoWsFieldsRequired"
  | "kommoWsPipelineCount"
  | "kommoWsModalTitle"
  | "kommoWsModalIntro"
  | "googleWsCardDescription"
  | "googleWsConnectButton"
  | "googleWsRedirecting"
  | "googleWsConnected"
  | "googleWsAttention"
  | "googleWsToolsCount"
  | "googleWsTestConnection"
  | "googleWsReconnect"
  | "googleWsDisconnect"
  | "googleWsDisconnectTitle"
  | "googleWsDisconnectDescription"
  | "googleWsDisconnecting"
  | "googleWsSessionExpired"
  | "googleWsDisconnectFailed"
  | "googleWsDisconnectedToast"
  | "googleWsDisconnectUnexpectedError"
  | "googleWsTestHealthy"
  | "googleWsTestFailed"
  | "googleWsTestUnexpectedError"
  | "googleWsStatusHealthy"
  | "googleWsStatusDegraded"
  | "googleWsStatusUnhealthy"
  | "googleWsStatusUnknown"
  | "googleWsOAuthSuccessToast"
  | "googleWsOAuthUnknownError"
  | "googleWsOAuthAccessDenied"
  | "googleWsOAuthNotConfigured"
  | "googleWsOAuthFailed"
  | "integrationBtnConnect"
  | "integrationBtnConnected"
  | "integrationModalPickFirst"
  | "integrationModalHint"
  | "integrationTabOverview"
  | "integrationTabSetup"
  | "integrationTabLinkUsers"
  | "integrationTabHelp"
  | "integrationOverviewIntro"
  | "integrationOverviewBotLanguage"
  | "integrationOverviewNotSet"
  | "integrationOverviewLastUpdated"
  | "integrationOverviewCreated"
  | "integrationOverviewWebhookTitle"
  | "integrationOverviewCopyWebhook"
  | "integrationOverviewWebhookHelp"
  | "integrationOverviewSecretsNote"
  | "integrationSetupIntro"
  | "integrationSetupBotFatherTitle"
  | "integrationSetupBotFatherStep1"
  | "integrationSetupBotFatherStep2"
  | "integrationSetupBotFatherStep3"
  | "integrationSetupBotTokenLabel"
  | "integrationSetupBotTokenPlaceholder"
  | "integrationSetupLanguageLabel"
  | "integrationSetupLanguagePlaceholder"
  | "integrationSetupAutoTokenTitle"
  | "integrationSetupAutoTokenDesc"
  | "integrationSetupScopesAccordion"
  | "integrationSetupConfirmToken"
  | "integrationSetupConfirmTokenWorking"
  | "integrationSetupManualTokenLabel"
  | "integrationSetupManualHelp"
  | "integrationSetupWebhookAdvanced"
  | "integrationSetupCopy"
  | "integrationSetupSaving"
  | "integrationSetupSave"
  | "integrationSetupNoPermission"
  | "integrationLinkSavedTitle"
  | "integrationLinkSavedBody"
  | "integrationLinkTitle"
  | "integrationLinkBody"
  | "integrationLinkGetCode"
  | "integrationLinkCreatingCode"
  | "integrationLinkYourCode"
  | "integrationLinkCopy"
  | "integrationLinkExpired"
  | "integrationLinkValidFor"
  | "integrationTroubleshootIntro"
  | "integrationTroubleshoot1Title"
  | "integrationTroubleshoot1Body"
  | "integrationTroubleshoot2Title"
  | "integrationTroubleshoot2Body"
  | "integrationTroubleshoot3Title"
  | "integrationTroubleshoot3Body"
  | "integrationCreateModalTitle"
  | "integrationCreateNameLabel"
  | "integrationCreateNamePlaceholder"
  | "integrationCreateDescLabel"
  | "integrationCreateDescPlaceholder"
  | "integrationCreateButton"
  | "integrationCreateCreating"
  | "integrationCountdownExpired"
  | "integrationToastNameRequired"
  | "integrationToastCreated"
  | "integrationToastContinueSetup"
  | "integrationToastBotTokenRequired"
  | "integrationToastNeedGeneratedToken"
  | "integrationToastPasteToken"
  | "integrationToastScopesAndToken"
  | "integrationToastSetupSaved"
  | "integrationToastLinkCodeOk"
  | "integrationToastCodeCopied"
  | "integrationToastWebhookCopied"
  | "integrationToastPermissionsChanged"
  | "integrationToastSignInForToken"
  | "integrationToastPickScopes"
  | "integrationToastTokenFail"
  | "integrationToastTokenCreatedAgain"
  | "integrationToastTokenCreated"
  | "integrationDefaultName"
  | "integrationDefaultDescription"
  | "errorUserNotAuthenticated"
  | "errorLabelLength"
  | "errorCouldNotLoadTokens"
  | "errorCouldNotRevokeToken"
  | "errorFailedToCreateToken"
  | "errorTokenNotAvailable"
  | "errorFailedToCopy"
  | "integrationDelete"
  | "integrationDeleting"
  | "integrationDeleteConfirm"
  | "integrationDeleteSuccess"
  | "integrationDeleteError"
  | "integrationEnable"
  | "integrationDisable"
  | "integrationEnabling"
  | "integrationDisabling"
  | "integrationStatusUpdated"
  | "integrationStatusUpdateError"
  | "integrationConfigure"
  | "integrationDisconnect"
  | "integrationWebhookUrl"
  | "copy"
  | "whatsappLiteNav"
  | "messagesSettingsNav"
  | "smsLiteNav"
  | "voiceCallsSettingsNav"
  | "smsLiteTitle"
  | "smsLiteSubtitle"
  | "smsLiteSessions"
  | "smsLiteTabSessionsDesc"
  | "smsLiteAutomation"
  | "smsLiteTabAutomationDesc"
  | "smsLiteRuleTemplates"
  | "smsLiteTabFlowsDesc"
  | "smsLiteBindingsTitle"
  | "smsLiteBindingsDesc"
  | "smsLiteBindingsEmpty"
  | "smsLiteCreateBinding"
  | "smsLiteEditBinding"
  | "smsLiteSession"
  | "smsLiteRuleTemplatesHint"
  | "smsLiteRuleTemplatesEmpty"
  | "smsLiteRuleTemplatesAdd"
  | "smsLiteRuleTemplatesNoSessionsLinked"
  | "smsLiteRuleTemplatesPriority"
  | "smsLiteSessionStatusActive"
  | "smsLiteSessionStatusDisabled"
  | "smsLiteSessionStatusPendingConfig"
  | "smsLiteAddSession"
  | "smsLiteEmptySessions"
  | "smsLiteEmptySessionsHint"
  | "smsLiteActionsAriaLabel"
  | "smsLiteSessionEnable"
  | "smsLiteSessionDisable"
  | "smsLiteSessionProvider"
  | "smsLiteSessionCreatedAt"
  | "smsLiteEditSessionTitle"
  | "smsLiteCreateSessionTitle"
  | "smsLiteSessionLabel"
  | "smsLiteSessionLabelPlaceholder"
  | "smsLiteSessionFromNumber"
  | "smsLiteSessionFromNumberPlaceholder"
  | "smsLiteSessionAccountSid"
  | "smsLiteSessionAccountSidPlaceholder"
  | "smsLiteSessionAccountSidKeepPlaceholder"
  | "smsLiteSessionAuthToken"
  | "smsLiteSessionAuthTokenPlaceholder"
  | "smsLiteSessionAuthTokenKeepPlaceholder"
  | "smsLiteSessionNameRequired"
  | "smsLiteSessionFromNumberRequired"
  | "smsLiteSessionCredentialsRequired"
  | "smsLiteSessionUpdated"
  | "smsLiteSessionCreated"
  | "smsLiteSessionEnabledToast"
  | "smsLiteSessionDisabledToast"
  | "smsLiteSessionDeleted"
  | "smsLiteDeleteSessionTitle"
  | "smsLiteDeleteSessionConfirm"
  | "smsLiteBindingSessionSearch"
  | "smsLiteBindingSessionEmptyNoSessions"
  | "smsLiteSearchNoResults"
  | "smsLiteBindingAgentSearch"
  | "smsLiteBindingAgentEmptyNoAgents"
  | "smsLiteSelectSession"
  | "smsLiteSelectAgent"
  | "smsLiteSelectProject"
  | "smsLiteSelectColumn"
  | "smsLiteBindingCreated"
  | "smsLiteBindingUpdated"
  | "smsLiteBindingPaused"
  | "smsLiteBindingResumed"
  | "smsLiteBindingDeleted"
  | "smsLiteDeleteBindingTitle"
  | "smsLiteDeleteBindingConfirm"
  | "smsLiteBindingLeadProjectColumnRequired"
  | "smsLiteFlowNameRequired"
  | "smsLiteFlowUpdated"
  | "smsLiteFlowCreated"
  | "smsLiteFlowDeleted"
  | "smsLiteDeleteFlowTitle"
  | "smsLiteDeleteFlowConfirm"
  | "smsLiteIntegrationCardDesc"
  | "smsLiteIntegrationActivate"
  | "smsLiteIntegrationActiveSessions"
  | "smsLiteIntegrationConfigure"
  | "smsLiteIntegrationNewSession"
  | "smsLiteIntegrationWizardTitle"
  | "smsLiteIntegrationWizardDesc"
  | "smsLiteIntegrationCreating"
  | "smsLiteIntegrationWebhookTitle"
  | "smsLiteIntegrationWebhookDesc"
  | "smsLiteIntegrationWebhookUrlLabel"
  | "smsLiteIntegrationCopyUrl"
  | "smsLiteIntegrationWebhookCopied"
  | "smsLiteIntegrationContinue"
  | "smsLiteIntegrationSessionCreatedTitle"
  | "smsLiteIntegrationSessionCreatedDesc"
  | "smsLiteIntegrationGoToSettings"
  | "smsLiteIntegrationClose"
  | "instagramLiteNav"
  | "instagramLiteTitle"
  | "instagramLiteSubtitle"
  | "instagramLiteIntegrationCardDesc"
  | "instagramLiteIntegrationActivate"
  | "instagramLiteIntegrationActiveSessions"
  | "instagramLiteIntegrationConfigure"
  | "instagramLiteIntegrationNewAccount"
  | "instagramLiteIntegrationAddAccount"
  | "instagramLiteFreeAccountHint"
  | "instagramLiteIntegrationAdding"
  | "instagramLiteIntegrationLabelPlaceholder"
  | "instagramLiteIntegrationLabelRequired"
  | "instagramLiteBillingActive"
  | "instagramLiteBillingPastDue"
  | "instagramLiteBillingFree"
  | "instagramLiteBillingCanceled"
  | "instagramLiteBillingPending"
  | "instagramLitePaymentStillProcessing"
  | "instagramLiteConnectBillingBlocked"
  | "letterheadTitle"
  | "letterheadDescription"
  | "letterheadEnabled"
  | "letterheadEnabledHint"
  | "letterheadCompanyName"
  | "letterheadCompanyNamePlaceholder"
  | "letterheadLogo"
  | "letterheadLogoUpload"
  | "letterheadLogoUploading"
  | "letterheadLogoRemove"
  | "letterheadLogoHint"
  | "letterheadPrimaryColor"
  | "letterheadInvalidColor"
  | "letterheadHeaderLayout"
  | "letterheadLayoutLeft"
  | "letterheadLayoutCenter"
  | "letterheadLayoutMinimal"
  | "letterheadFooterText"
  | "letterheadFooterPlaceholder"
  | "letterheadFooterHint"
  | "letterheadSaved"
  | "letterheadSaveError"
  | "documentTemplatesTitle"
  | "documentTemplatesDescription"
  | "documentTemplatesAdd"
  | "documentTemplatesName"
  | "documentTemplatesNamePlaceholder"
  | "documentTemplatesDescriptionOptional"
  | "documentTemplatesDescriptionPlaceholder"
  | "documentTemplatesCategory"
  | "documentTemplatesCategoryInvoice"
  | "documentTemplatesCategoryReport"
  | "documentTemplatesCategoryProposal"
  | "documentTemplatesCategorySupportHours"
  | "documentTemplatesCategoryContract"
  | "documentTemplatesCategoryOther"
  | "documentTemplatesFile"
  | "documentTemplatesSelectFile"
  | "documentTemplatesPlaceholderHint"
  | "documentTemplatesUpload"
  | "documentTemplatesUploading"
  | "documentTemplatesUploadSuccess"
  | "documentTemplatesUploadError"
  | "documentTemplatesUploadValidation"
  | "documentTemplatesDeleteSuccess"
  | "documentTemplatesDeleteError"
  | "documentTemplatesLoading"
  | "documentTemplatesEmpty"
  | "documentTemplatesEmptyHint"
  | "documentTemplatesFields"
  | "documentTemplatesKindHtml"
  | "documentTemplatesKindDocx"
  | "whatsappLiteBindingAutoReplyScope"
  | "whatsappLiteBindingAutoReplyScopeHint"
  | "whatsappLiteBindingAutoReplyScopeDirect"
  | "whatsappLiteBindingAutoReplyScopeGroup"
  | "whatsappLiteBindingAutoReplyScopeBoth"
  | "instagramLiteStatusConnected"
  | "instagramLiteStatusPendingConnect"
  | "instagramLiteStatusReconnectRequired"
  | "instagramLiteStatusDisabled"
  | "instagramLiteSessions"
  | "instagramLiteSessionsDesc"
  | "instagramLiteAutomation"
  | "instagramLiteAutomationDesc"
  | "instagramLiteTemplates"
  | "instagramLiteTemplatesDesc"
  | "instagramLiteNoSessions"
  | "instagramLiteUsernamePending"
  | "instagramLiteSessionAccessTitle"
  | "instagramLiteSessionAccessDesc"
  | "smsLiteSessionAccessTitle"
  | "smsLiteSessionAccessDesc"
  | "instagramLiteNoTemplates"
  | "instagramLiteConnect"
  | "instagramLiteReconnect"
  | "instagramLiteSession"
  | "instagramLiteBindingsEmpty"
  | "instagramLiteCreateBinding"
  | "messagingBindingNoAgentAssigned"
  | "messagingBindingScopeConversation"
  | "messagingBindingScopeConversationHint"
  | "messagingBindingAutoUpdate"
  | "messagingBindingEditAria"
  | "messagingBindingPauseAria"
  | "messagingBindingResumeAria"
  | "messagingBindingDeleteAria"
  | "whatsappLiteTitle"
  | "whatsappLiteSubtitle"
  | "whatsappLiteSessions"
  | "whatsappLiteAddSession"
  | "whatsappLitePaidPlanRequired"
  | "whatsappLiteTransport"
  | "whatsappLiteTransportBaileys"
  | "whatsappLiteTransportCloud"
  | "whatsappLiteTransportBaileysHint"
  | "whatsappLiteTransportCloudHint"
  | "whatsappLiteCloudAddDesc"
  | "whatsappLiteEmbeddedSignupDesc"
  | "whatsappLiteEmbeddedSignupContinue"
  | "whatsappLiteEmbeddedSignupShowManual"
  | "whatsappLiteEmbeddedSignupHideManual"
  | "whatsappLiteEmbeddedSignupMissingIds"
  | "whatsappLiteEmbeddedSignupFailed"
  | "whatsappLiteEmbeddedSignupPinTitle"
  | "whatsappLiteEmbeddedSignupPinDesc"
  | "whatsappLiteEmbeddedSignupPinSubmit"
  | "whatsappLiteCloudSetupIntro"
  | "whatsappLiteCloudSetupStep1"
  | "whatsappLiteCloudSetupStep2"
  | "whatsappLiteCloudSetupStep3"
  | "whatsappLiteCloudSectionIds"
  | "whatsappLiteCloudSectionSecrets"
  | "whatsappLiteCloudWabaId"
  | "whatsappLiteCloudWabaIdHint"
  | "whatsappLiteCloudPhoneNumberId"
  | "whatsappLiteCloudPhoneNumberIdHint"
  | "whatsappLiteCloudAccessToken"
  | "whatsappLiteCloudAccessTokenHint"
  | "whatsappLiteCloudPin"
  | "whatsappLiteCloudPinHint"
  | "whatsappLiteCloudPinProgress"
  | "whatsappLiteCloudShowPin"
  | "whatsappLiteCloudHidePin"
  | "whatsappLiteCloudMetaLink"
  | "whatsappLiteCloudConnectSaving"
  | "whatsappLiteCloudUpdateCredentials"
  | "whatsappLiteCloudUpdateTitle"
  | "whatsappLiteCloudUpdateDesc"
  | "whatsappLiteCloudUpdateSaving"
  | "whatsappLiteCloudRegistered"
  | "whatsappLiteCloudAlreadyRegistered"
  | "whatsappLiteCloudUpdated"
  | "whatsappLiteCloudConnected"
  | "whatsappLiteCloudTemplatesTab"
  | "whatsappLiteCloudTemplatesTitle"
  | "whatsappLiteCloudTemplatesDesc"
  | "whatsappLiteCloudTemplatesEmpty"
  | "whatsappLiteCloudTemplatesSync"
  | "whatsappLiteCloudTemplatesSynced"
  | "whatsappLiteCloudTemplatesCreate"
  | "whatsappLiteCloudTemplateName"
  | "whatsappLiteCloudTemplateNameHint"
  | "whatsappLiteCloudTemplateLanguage"
  | "whatsappLiteCloudTemplateCategory"
  | "whatsappLiteCloudTemplateHeader"
  | "whatsappLiteCloudTemplateHeaderType_NONE"
  | "whatsappLiteCloudTemplateHeaderType_TEXT"
  | "whatsappLiteCloudTemplateHeaderType_IMAGE"
  | "whatsappLiteCloudTemplateHeaderType_VIDEO"
  | "whatsappLiteCloudTemplateHeaderType_DOCUMENT"
  | "whatsappLiteCloudTemplateHeaderTextPlaceholder"
  | "whatsappLiteCloudTemplateHeaderUpload"
  | "whatsappLiteCloudTemplateHeaderUploadHint"
  | "whatsappLiteCloudTemplateBody"
  | "whatsappLiteCloudTemplateBodyHint"
  | "whatsappLiteCloudTemplateBodyExamples"
  | "whatsappLiteCloudTemplateBodyExamplesHint"
  | "whatsappLiteCloudTemplateBodyExamplePlaceholder"
  | "whatsappLiteCloudTemplateFooter"
  | "whatsappLiteCloudTemplateButtons"
  | "whatsappLiteCloudTemplateButtonQuickReply"
  | "whatsappLiteCloudTemplateButtonUrl"
  | "whatsappLiteCloudTemplateButtonText"
  | "whatsappLiteCloudTemplateAddButton"
  | "whatsappLiteCloudTemplateRemoveButton"
  | "whatsappLiteCloudTemplateCreated"
  | "whatsappLiteCloudTemplateDeleted"
  | "whatsappLiteCloudTemplateDeleteTitle"
  | "whatsappLiteCloudTemplateDeleteConfirm"
  | "whatsappLiteCloudTemplateVarBindingsTitle"
  | "whatsappLiteCloudTemplateVarBindingsDesc"
  | "whatsappLiteTemplateSettingsTitle"
  | "whatsappLiteTemplateSettingsSubtitle"
  | "whatsappLiteTemplateIdentification"
  | "whatsappLiteTemplateLanguageSection"
  | "whatsappLiteTemplateVarColumn"
  | "whatsappLiteTemplateCrmFieldColumn"
  | "whatsappLiteTemplateVarsFound"
  | "whatsappLiteTemplatePrimaryLanguage"
  | "whatsappLiteTemplateSaveChanges"
  | "whatsappLiteTemplateUnsavedTitle"
  | "whatsappLiteTemplateUnsavedDesc"
  | "whatsappLiteKeepEditing"
  | "whatsappLitePreviewMessagePlaceholder"
  | "whatsappLiteCloudNoSessions"
  | "whatsappLiteCloudSelectSession"
  | "whatsappLiteWorkspaceTemplatesTab"
  | "whatsappLiteWorkspaceTemplatesTabDesc"
  | "messagingShortcutsNav"
  | "messagingShortcutsSubtitle"
  | "messagingShortcutsSearchPlaceholder"
  | "messagingShortcutsSessionFilterLabel"
  | "messagingShortcutsSessionFilterAll"
  | "messagingShortcutsLoadingMore"
  | "whatsappLiteWorkspaceTemplatesTitle"
  | "whatsappLiteWorkspaceTemplatesDesc"
  | "whatsappLiteWorkspaceTemplatesEmpty"
  | "whatsappLiteWorkspaceTemplatesCreate"
  | "whatsappLiteWorkspaceTemplateName"
  | "whatsappLiteWorkspaceTemplateNameHint"
  | "whatsappLiteWorkspaceTemplateShortcut"
  | "whatsappLiteWorkspaceTemplateShortcutHint"
  | "whatsappLiteWorkspaceTemplateBody"
  | "whatsappLiteWorkspaceTemplateBodyHint"
  | "whatsappLiteWorkspaceTemplatePreview"
  | "whatsappLiteWorkspaceTemplateEdit"
  | "whatsappLiteWorkspaceTemplateCreated"
  | "whatsappLiteWorkspaceTemplateUpdated"
  | "whatsappLiteWorkspaceTemplateDeleted"
  | "whatsappLiteWorkspaceTemplateDeleteTitle"
  | "whatsappLiteWorkspaceTemplateDeleteConfirm"
  | "whatsappLiteWorkspaceTemplateAttachments"
  | "whatsappLiteWorkspaceTemplateAttachmentBadge"
  | "whatsappLiteLabel"
  | "whatsappLiteRename"
  | "whatsappLiteReconnectSession"
  | "whatsappLiteReconnectStarted"
  | "whatsappLiteSessionAccessTitle"
  | "whatsappLiteSessionAccessDesc"
  | "whatsappLiteSessionSharingWith"
  | "whatsappLiteSessionNoAccessYet"
  | "whatsappLiteSessionAddRole"
  | "whatsappLiteSessionNoRolesToAdd"
  | "whatsappLiteSessionCanEdit"
  | "whatsappLiteSessionCanView"
  | "whatsappLiteSessionNeedUserOrRole"
  | "whatsappLiteSessionMakePublic"
  | "whatsappLiteSessionMakePrivate"
  | "messagingAclAccessDescTail"
  | "messagingAclScopeUserAssigned"
  | "messagingAclScopeAll"
  | "messagingAclScopeRoleAssigned"
  | "messagingAclScopeRoleGroup"
  | "messagingAclScopeRoleAll"
  | "whatsappLiteConnectQr"
  | "whatsappLiteDelete"
  | "whatsappLiteDeleteConfirmDescription"
  | "whatsappLiteQrTitle"
  | "whatsappLiteQrHelp"
  | "whatsappLiteStatusDisconnected"
  | "whatsappLiteStatusQrPending"
  | "whatsappLiteStatusConnected"
  | "whatsappLiteStatusBanned"
  | "whatsappLiteEmptySessions"
  | "whatsappLiteAutomation"
  | "whatsappLiteTabSessionsDesc"
  | "whatsappLiteTabAutomationDesc"
  | "whatsappLiteTabFlowsDesc"
  | "whatsappLiteBindingsTitle"
  | "whatsappLiteBindingsDesc"
  | "whatsappLiteBindingsEmpty"
  | "whatsappLitePause"
  | "whatsappLiteResume"
  | "whatsappLiteRefresh"
  | "whatsappLiteEntityStatusActive"
  | "whatsappLiteEntityStatusPaused"
  | "whatsappLiteEntityStatusDraft"
  | "whatsappLiteEntityStatusRunning"
  | "whatsappLiteEntityStatusCompleted"
  | "whatsappLiteEntityStatusCancelled"
  | "whatsappLiteEntityStatusFailed"
  | "whatsappLiteBindingModeAutoReply"
  | "whatsappLiteBindingModeFirstMessageOnly"
  | "whatsappLiteBindingModeWorkflowTrigger"
  | "whatsappLiteBindingScopeAllInbound"
  | "whatsappLiteCreateBinding"
  | "whatsappLiteAgent"
  | "whatsappLiteAgentChannelHint"
  | "whatsappLiteNoAgentsWithWhatsappChannel"
  | "whatsappLiteSession"
  | "whatsappLiteModeAutoReply"
  | "whatsappLiteMaxRepliesDay"
  | "whatsappLiteStopPolling"
  | "whatsappLiteConnectedAs"
  | "whatsappLitePickAgentSession"
  | "whatsappLiteQrRequestFailed"
  | "whatsappLiteQrWaitingServer"
  | "whatsappLiteQrSlowHint"
  | "whatsappLiteQrPairingFailed"
  | "whatsappLiteConnectModalTitle"
  | "whatsappLiteConnectModalSubtitleBefore"
  | "whatsappLiteConnectModalSubtitleAfter"
  | "whatsappLiteLabelPlaceholder"
  | "whatsappLiteSyncHistoryTitle"
  | "whatsappLiteSyncHistoryDesc"
  | "whatsappLiteWhatsAppWeb"
  | "whatsappLiteMetaApiOfficial"
  | "whatsappLiteMetaApiComingSoon"
  | "whatsappLiteQrHelpBefore"
  | "whatsappLiteQrHelpHighlight"
  | "whatsappLiteQrHelpAfter"
  | "whatsappLiteQrConnectionFailed"
  | "whatsappLiteQrRefreshAria"
  | "whatsappLiteConnectedTitle"
  | "whatsappLiteConnectedDesc"
  | "whatsappLiteSetupLaterHint"
  | "whatsappLiteDoItLater"
  | "whatsappLiteDisconnectBannerTitle"
  | "whatsappLiteDisconnectBannerBody"
  | "whatsappLiteDisconnectBannerSeeLater"
  | "whatsappLiteDisconnectBannerTakeAction"
  | "whatsappLiteFinish"
  | "whatsappLiteEditBinding"
  | "whatsappLiteAutoCreateLead"
  | "whatsappLiteAutoCreateLeadHint"
  | "whatsappLiteBindingSendReply"
  | "whatsappLiteBindingSendReplyHint"
  | "whatsappLiteBindingSendReplyOn"
  | "whatsappLiteBindingSendReplyOff"
  | "whatsappLiteBindingAllowImageGeneration"
  | "whatsappLiteBindingAllowImageGenerationHint"
  | "bindingPermissionsTitle"
  | "bindingPermissionsHint"
  | "bindingWorkspaceAccess"
  | "bindingWorkspaceAccessHint"
  | "bindingWorkspaceAccessNone"
  | "bindingWorkspaceAccessRead"
  | "bindingWorkspaceAccessReadWrite"
  | "bindingAllowMessagingOthers"
  | "bindingAllowMessagingOthersHint"
  | "bindingAllowReadingOtherConversations"
  | "bindingAllowReadingOtherConversationsHint"
  | "whatsappLiteBindingWorkspaceAccessTitle"
  | "whatsappLiteBindingWorkspaceAccessDesc"
  | "whatsappLiteBindingAllowEnumeration"
  | "whatsappLiteBindingAllowEnumerationHint"
  | "whatsappLiteBindingAllowWrites"
  | "whatsappLiteBindingAllowWritesHint"
  | "whatsappLiteBindingEnumerationOn"
  | "whatsappLiteBindingEnumerationOff"
  | "whatsappLiteBindingWritesOn"
  | "whatsappLiteBindingWritesOff"
  | "whatsappLiteAiAutomationRequiresPlan"
  | "whatsappLiteFlowModalClose"
  | "whatsappLiteSelectPlaceholder"
  | "whatsappLiteLeadProject"
  | "whatsappLiteLeadProjectSearch"
  | "whatsappLiteLeadProjectNoMatch"
  | "whatsappLiteLeadCrmBoardsHint"
  | "whatsappLiteLeadBoard"
  | "whatsappLiteLeadColumn"
  | "whatsappLiteLeadSource"
  | "whatsappLiteNoCrmProjects"
  | "whatsappLiteNoProjects"
  | "whatsappLitePickProjectColumn"
  | "whatsappLiteAutoLeadPriority"
  | "whatsappLiteAutoLeadPriorityHint"
  | "whatsappLiteBindingLeadLine"
  | "whatsappLiteBindingLeadOff"
  | "whatsappLiteBindingPriorityOn"
  | "whatsappLiteBindingPriorityOff"
  | "whatsappLiteBindingUpdated"
  | "whatsappLiteFollowupEnabled"
  | "whatsappLiteFollowupEnabledHint"
  | "whatsappLiteFollowupAllowAgentScheduling"
  | "whatsappLiteFollowupAllowAgentSchedulingHint"
  | "whatsappLiteFollowupOnlyWhenLinkedCard"
  | "whatsappLiteFollowupOnlyWhenLinkedCardHint"
  | "whatsappLiteFollowupOnlyWhenLinkedCardNeedsProject"
  | "whatsappLiteFollowupMax"
  | "whatsappLiteFollowupFirstDelay"
  | "whatsappLiteFollowupFirstDelayValue"
  | "whatsappLiteFollowupSubsequentDelay"
  | "whatsappLiteFollowupSubsequentDelayValue"
  | "whatsappLiteFollowupStopOnReply"
  | "whatsappLiteFollowupUseAgent"
  | "whatsappLiteFollowupMaxHint"
  | "whatsappLiteFollowupSendAtTime"
  | "whatsappLiteFollowupSendAtTimeHint"
  | "whatsappLiteFollowupRequireBusinessHours"
  | "whatsappLiteFollowupMessagesPlaceholder"
  | "whatsappLiteFollowupTimingModeAfter"
  | "whatsappLiteFollowupTimingModeAt"
  | "whatsappLiteDelayUnitMinutes"
  | "whatsappLiteDelayUnitHours"
  | "whatsappLiteDelayUnitDays"
  | "whatsappLiteDelayUnitWeeks"
  | "crmLeadSyncEnabled"
  | "crmLeadSyncActivate"
  | "crmLeadSyncEnabledHint"
  | "crmLeadSyncAgentLabel"
  | "crmLeadSyncAgentInherit"
  | "crmLeadSyncInstructions"
  | "crmLeadSyncInstructionsPlaceholder"
  | "crmLeadSyncInstructionsHint"
  | "crmLeadSyncAllowedFields"
  | "crmLeadSyncAllowedFieldsHint"
  | "crmLeadSyncTriggers"
  | "crmLeadSyncTriggerAfterReply"
  | "crmLeadSyncTriggerAfterInbound"
  | "crmLeadSyncTriggerIdle"
  | "crmLeadSyncMinInterval"
  | "crmLeadSyncMinIntervalHint"
  | "crmLeadSyncModel"
  | "crmLeadSyncFieldDescription"
  | "crmLeadSyncFieldLabels"
  | "crmLeadSyncFieldEmail"
  | "crmLeadSyncFieldPhone"
  | "crmLeadSyncFieldDeadline"
  | "crmLeadSyncFieldContactName"
  | "crmLeadSyncFieldCompany"
  | "crmLeadSyncFieldName"
  | "crmLeadSyncFieldCustomFields"
  | "whatsappLiteMaxRepliesInvalid"
  | "whatsappLiteRuleTemplates"
  | "whatsappLiteRuleTemplatesHint"
  | "whatsappLiteRuleTemplatesEmpty"
  | "whatsappLiteRuleTemplatesAdd"
  | "whatsappLiteRuleTemplatesName"
  | "whatsappLiteRuleTemplatesSessionsLabel"
  | "whatsappLiteRuleTemplatesSessionsHint"
  | "whatsappLiteRuleTemplatesSessionsEmpty"
  | "whatsappLiteRuleTemplatesSessionsRequired"
  | "whatsappLiteRuleTemplatesSessionsChoose"
  | "whatsappLiteRuleTemplatesSessionsCountSelected"
  | "whatsappLiteRuleTemplatesNoSessionsLinked"
  | "whatsappLiteRuleTemplatesPriority"
  | "whatsappLiteRuleTemplatesStatus"
  | "whatsappLiteRuleTemplatesStatusActive"
  | "whatsappLiteRuleTemplatesStatusPaused"
  | "whatsappLiteRuleTemplatesRootJson"
  | "whatsappLiteRuleTemplatesJsonError"
  | "whatsappLiteRuleTemplatesCreateTitle"
  | "whatsappLiteRuleTemplatesEditTitle"
  | "smsLiteRuleTemplatesCreateTitle"
  | "smsLiteRuleTemplatesEditTitle"
  | "smsLiteTemplateFlowDragHint"
  | "smsLiteRuleTemplatesSessionsLabel"
  | "smsLiteRuleTemplatesSessionsHint"
  | "smsLiteRuleTemplatesSessionsEmpty"
  | "smsLiteRuleTemplatesSessionsChoose"
  | "smsLiteRuleTemplatesSessionsCountSelected"
  | "smsLiteRuleTemplatesNumberSearch"
  | "smsLiteRuleTemplatesNumberNoMatch"
  | "smsLiteRuleTemplatesActionSendText"
  | "smsLiteRuleTemplatesSendTextLabel"
  | "instagramLiteRuleTemplatesCreateTitle"
  | "instagramLiteRuleTemplatesEditTitle"
  | "instagramLiteTemplateFlowDragHint"
  | "instagramLiteRuleTemplatesSessionsLabel"
  | "instagramLiteRuleTemplatesSessionsHint"
  | "instagramLiteRuleTemplatesSessionsEmpty"
  | "instagramLiteRuleTemplatesSessionsChoose"
  | "instagramLiteRuleTemplatesSessionsCountSelected"
  | "instagramLiteRuleTemplatesAccountSearch"
  | "instagramLiteRuleTemplatesAccountNoMatch"
  | "instagramLiteRuleTemplatesActionSendText"
  | "instagramLiteRuleTemplatesSendTextLabel"
  | "instagramLiteRuleTemplatesWhenComment"
  | "instagramLiteRuleTemplatesWhenCommentAll"
  | "instagramLiteRuleTemplatesWhenCommentSelected"
  | "instagramLiteRuleTemplatesCommentTextMatch"
  | "instagramLiteRuleTemplatesCommentTextAny"
  | "instagramLiteRuleTemplatesPostsBrowseAccount"
  | "instagramLiteRuleTemplatesPostsFilter"
  | "instagramLiteRuleTemplatesPostsEmpty"
  | "instagramLiteRuleTemplatesPostsLoadMore"
  | "instagramLiteRuleTemplatesActionReplyToComment"
  | "instagramLiteRuleTemplatesReplyLabel"
  | "whatsappLiteRuleTemplatesActionCreateLead"
  | "whatsappLiteRuleTemplatesActionCreateContact"
  | "whatsappLiteRuleTemplatesActionStopFlow"
  | "whatsappLiteRuleTemplatesStopFlowHint"
  | "whatsappLiteRuleTemplatesCreateLeadSource"
  | "whatsappLiteRuleTemplatesCreateLeadHint"
  | "whatsappLiteRuleTemplatesCreateContactHint"
  | "whatsappLiteRuleTemplatesSimulate"
  | "whatsappLiteRuleTemplatesSimulateTitle"
  | "whatsappLiteRuleTemplatesSimMessage"
  | "whatsappLiteRuleTemplatesSimInbound"
  | "whatsappLiteRuleTemplatesSimSession"
  | "whatsappLiteRuleTemplatesSimOptionalNumber"
  | "whatsappLiteRuleTemplatesSimNumberHint"
  | "whatsappLiteRuleTemplatesSimClearNumber"
  | "whatsappLiteRuleTemplatesNumberSearch"
  | "whatsappLiteRuleTemplatesNumberNoMatch"
  | "whatsappLiteRuleTemplatesSimMatched"
  | "whatsappLiteRuleTemplatesSimNotMatched"
  | "whatsappLiteRuleTemplatesSimRuleIndex"
  | "whatsappLiteRuleTemplatesDelete"
  | "whatsappLiteRuleTemplatesDeleteConfirm"
  | "whatsappLiteRuleTemplatesSaved"
  | "whatsappLiteRuleTemplatesCreated"
  | "whatsappLiteRuleTemplatesWorkflowIntro"
  | "whatsappLiteRuleTemplatesRuleTitle"
  | "whatsappLiteRuleTemplatesRemoveRule"
  | "whatsappLiteRuleTemplatesAddRule"
  | "whatsappLiteRuleTemplatesWhenLabel"
  | "whatsappLiteRuleTemplatesWhenFirstInbound"
  | "whatsappLiteRuleTemplatesWhenContains"
  | "whatsappLiteRuleTemplatesWhenNotContains"
  | "whatsappLiteRuleTemplatesWhenRegex"
  | "whatsappLiteRuleTemplatesWhenLlm"
  | "whatsappLiteRuleTemplatesWhenLlmConversation"
  | "whatsappLiteRuleTemplatesWhenEventDateDaysAhead"
  | "whatsappLiteRuleTemplatesEventDateOpLabel"
  | "whatsappLiteRuleTemplatesEventDateDaysLabel"
  | "whatsappLiteRuleTemplatesEventDateMatchIfMissing"
  | "whatsappLiteRuleTemplatesEventDateHint"
  | "whatsappLiteRuleTemplatesEventDateOpGt"
  | "whatsappLiteRuleTemplatesEventDateOpGte"
  | "whatsappLiteRuleTemplatesEventDateOpLt"
  | "whatsappLiteRuleTemplatesEventDateOpLte"
  | "whatsappLiteRuleTemplatesEventDateOpEq"
  | "whatsappLiteRuleTemplatesLlmConvPromptLabel"
  | "whatsappLiteRuleTemplatesLlmConvPromptPlaceholder"
  | "whatsappLiteRuleTemplatesContainsPhrase"
  | "whatsappLiteRuleTemplatesIgnoreCase"
  | "whatsappLiteRuleTemplatesRegexPatternLabel"
  | "whatsappLiteRuleTemplatesLlmLabelsLabel"
  | "whatsappLiteRuleTemplatesLlmLabelsDesc"
  | "whatsappLiteRuleTemplatesLlmResultsHint"
  | "whatsappLiteRuleTemplatesLlmAddResult"
  | "whatsappLiteRuleTemplatesLlmTopPath"
  | "whatsappLiteRuleTemplatesLlmMatchLabel"
  | "whatsappLiteRuleTemplatesLlmMatchDesc"
  | "whatsappLiteRuleTemplatesLlmHintLabel"
  | "whatsappLiteRuleTemplatesLlmHintDesc"
  | "whatsappLiteRuleTemplatesActionsLabel"
  | "whatsappLiteRuleTemplatesAddActionAgent"
  | "whatsappLiteRuleTemplatesAddActionMoveCard"
  | "whatsappLiteRuleTemplatesRemoveAction"
  | "whatsappLiteRuleTemplatesActionType"
  | "whatsappLiteRuleTemplatesSendReply"
  | "whatsappLiteRuleTemplatesMoveProject"
  | "whatsappLiteRuleTemplatesMoveColumn"
  | "whatsappLiteRuleTemplatesPickProject"
  | "whatsappLiteRuleTemplatesPickColumn"
  | "whatsappLiteRuleTemplatesGroupSearch"
  | "whatsappLiteRuleTemplatesGroupNone"
  | "whatsappLiteRuleTemplatesGroupNeedSession"
  | "whatsappLiteRuleTemplatesChooseAgent"
  | "whatsappLiteRuleTemplatesPickAgent"
  | "whatsappLiteRuleTemplatesAgentSearch"
  | "whatsappLiteRuleTemplatesActionSearch"
  | "whatsappLiteRuleTemplatesActionNoMatch"
  | "whatsappLiteRuleTemplatesAgentNoMatch"
  | "whatsappLiteRuleTemplatesNoAgentsInWorkspace"
  | "whatsappLiteRuleTemplatesEditorAdvanced"
  | "whatsappLiteRuleTemplatesEditorVisual"
  | "whatsappLiteRuleTemplatesAdvancedHint"
  | "whatsappLiteRuleTemplatesAdvancedJson"
  | "whatsappLiteRuleTemplatesUnsupported"
  | "whatsappLiteRuleTemplatesValidationRule"
  | "whatsappLiteRuleTemplatesValidationWhen"
  | "whatsappLiteRuleTemplatesValidationWhenChatTypeOr"
  | "whatsappLiteRuleTemplatesValidationWhenLlmRequiresPlan"
  | "whatsappLiteRuleTemplatesValidationAction"
  | "whatsappLiteRuleTemplatesActionExecuteAgent"
  | "whatsappLiteRuleTemplatesActionMoveCard"
  | "whatsappLiteRuleTemplatesActionCloneCard"
  | "whatsappLiteRuleTemplatesActionSendText"
  | "whatsappLiteRuleTemplatesActionScheduleFollowup"
  | "whatsappLiteRuleTemplatesActionAddLabel"
  | "whatsappLiteRuleTemplatesActionSetLeadSource"
  | "whatsappLiteRuleTemplatesActionTransitionState"
  | "whatsappLiteRuleTemplatesActionDisableAutoReply"
  | "whatsappLiteRuleTemplatesActionEnableConversationAgent"
  | "whatsappLiteRuleTemplatesDisableAutoReplyHint"
  | "whatsappLiteRuleTemplatesEnableConversationAgentHint"
  | "whatsappLiteRuleTemplatesActionDistributeLead"
  | "whatsappLiteRuleTemplatesActionAssignConversation"
  | "whatsappLiteRuleTemplatesActionRouteToCrm"
  | "whatsappLiteRuleTemplatesAssignUserOptional"
  | "whatsappLiteRuleTemplatesAssignUserPlaceholder"
  | "whatsappLiteRuleTemplatesAssignUserHint"
  | "whatsappLiteRuleTemplatesAssignUserRoundRobin"
  | "whatsappLiteRuleTemplatesAssignUserSearch"
  | "whatsappLiteRuleTemplatesLabelText"
  | "whatsappLiteRuleTemplatesLabelTextPlaceholder"
  | "whatsappLiteRuleTemplatesLabelColor"
  | "whatsappLiteRuleTemplatesLeadSourceText"
  | "whatsappLiteRuleTemplatesLeadSourcePlaceholder"
  | "whatsappLiteRuleTemplatesTransitionStateLabel"
  | "whatsappLiteRuleTemplatesTransitionStateStopsAutoReply"
  | "whatsappLiteConvStateNewLead"
  | "whatsappLiteConvStateQualifying"
  | "whatsappLiteConvStateWaitingResponse"
  | "whatsappLiteConvStateNegotiating"
  | "whatsappLiteConvStateHumanHandoff"
  | "whatsappLiteConvStateFollowup"
  | "whatsappLiteConvStateWon"
  | "whatsappLiteConvStateLost"
  | "whatsappLiteConvStateBlocked"
  | "whatsappLiteConvStateIdle"
  | "whatsappLiteRuleTemplatesFollowupMessages"
  | "whatsappLiteRuleTemplatesFollowupMessagesHint"
  | "whatsappLiteRuleTemplatesAddActionSendText"
  | "whatsappLiteRuleTemplatesAddActionFollowup"
  | "whatsappLiteRuleTemplatesSendTextLabel"
  | "whatsappLiteRuleTemplatesSendTextHint"
  | "whatsappLiteRuleTemplatesSendTextChainHint"
  | "whatsappLiteRuleTemplatesConditionLabel"
  | "whatsappLiteRuleTemplatesConditionAndHint"
  | "whatsappLiteRuleTemplatesWhenSearch"
  | "whatsappLiteRuleTemplatesWhenNoMatch"
  | "whatsappLiteTemplateFlowAddCondition"
  | "whatsappLiteTemplateFlowAddActionMenu"
  | "whatsappLiteTemplateFlowEndTitle"
  | "whatsappLiteTemplateFlowDragHint"
  | "whatsappLiteTemplateFlowInspectorTitle"
  | "whatsappLiteTemplateFlowInspectorEmpty"
  | "whatsappLiteTemplateFlowTabFlow"
  | "whatsappLiteTemplateFlowTabJson"
  | "whatsappLiteTemplateFlowRulesSidebar"
  | "whatsappLiteTemplateFlowNodeTriggerHeader"
  | "whatsappLiteTemplateFlowTriggerEvent"
  | "whatsappLiteTemplateFlowTriggerInbound"
  | "whatsappLiteTemplateFlowTriggerSent"
  | "whatsappLiteTemplateFlowTriggerTemplateSent"
  | "whatsappLiteTemplateFlowTriggerComment"
  | "whatsappLiteTemplateFlowCommentTriggerHint"
  | "whatsappLiteTemplateFlowAddBranch"
  | "whatsappLiteTemplateFlowTriggerTextOp"
  | "whatsappLiteTemplateFlowTriggerTextContains"
  | "whatsappLiteTemplateFlowTriggerTextNotContains"
  | "whatsappLiteTemplateFlowTriggerTextNone"
  | "whatsappLiteTemplateFlowTriggerInspectorHint"
  | "whatsappLiteTemplateFlowInsertCondition"
  | "whatsappLiteTemplateFlowBranchYes"
  | "whatsappLiteTemplateFlowBranchNo"
  | "whatsappLiteTemplateFlowOtherwise"
  | "whatsappLiteTemplateFlowOtherwiseHint"
  | "whatsappLiteTemplateFlowNodeConditionHeader"
  | "whatsappLiteTemplateFlowNodeActionHeader"
  | "whatsappLiteTemplateFlowConfigValid"
  | "whatsappLiteTemplateFlowConfigIncomplete"
  | "whatsappLiteTemplateFlowCloseInspector"
  | "whatsappLiteDelayUnitMinutes"
  | "whatsappLiteDelayUnitHours"
  | "whatsappLiteDelayUnitDays"
  | "whatsappLiteDelayUnitWeeks"
  | "whatsappLiteDelayUnitMonths"
  // Response SLA
  | "whatsappLiteSlaTitle"
  | "whatsappLiteSlaDescription"
  | "whatsappLiteSlaEnabled"
  | "whatsappLiteSlaWarning"
  | "whatsappLiteSlaCritical"
  | "whatsappLiteSlaMinutes"
  | "whatsappLiteSlaSaved"
  | "whatsappLiteSlaDefault"
  | "whatsappLiteSlaAddColumn"
  | "whatsappLiteSlaProject"
  | "whatsappLiteSlaColumn"
  | "whatsappLiteSlaRemoveRule"
  | "whatsappLiteSlaColumnRules"
  | "whatsappLiteOutboundNamePrefixTitle"
  | "whatsappLiteOutboundNamePrefixDescription"
  | "whatsappLiteOutboundNamePrefixEnabled"
  | "whatsappLiteOutboundNamePrefixSaved"
  | "whatsappLiteLinkedLeadInboxTitle"
  | "whatsappLiteLinkedLeadInboxDescription"
  | "whatsappLiteLinkedLeadInboxEnabled"
  | "whatsappLiteLinkedLeadInboxSaved"
  // Messaging SLA + outbound name-prefix (channel-neutral, used by Instagram/SMS settings)
  | "messagingSlaTitle"
  | "messagingSlaDescription"
  | "messagingSlaDefault"
  | "messagingSlaWarning"
  | "messagingSlaCritical"
  | "messagingSlaMinutes"
  | "messagingSlaColumnRules"
  | "messagingSlaAddColumn"
  | "messagingSlaProject"
  | "messagingSlaColumn"
  | "messagingSlaRemoveRule"
  | "messagingSlaSaved"
  | "messagingOutboundNamePrefixTitle"
  | "messagingOutboundNamePrefixDescription"
  | "messagingOutboundNamePrefixEnabled"
  | "messagingOutboundNamePrefixSaved"
  // Blast Campaigns
  | "blastCampaignsTab"
  | "blastCampaignsTitle"
  | "blastCampaignsDescription"
  | "blastCampaignsCreate"
  | "blastCampaignsEmpty"
  | "blastCampaignCreated"
  | "blastCampaignName"
  | "blastCampaignDescription"
  | "blastCampaignSession"
  | "blastCampaignSelectSession"
  | "blastCampaignDailyLimit"
  | "blastCampaignInterval"
  | "blastCampaignCustomInterval"
  | "blastCampaignCustomIntervalHint"
  | "blastCampaignIntervalMs"
  | "blastCampaignIntervalInvalid"
  | "blastCampaignSecondsIntervalInvalid"
  | "blastCampaignIntervalNeedsSession"
  | "blastCampaignEstimatedDuration"
  | "blastCampaignEstimatedLeft"
  | "blastCampaignDurationSeconds"
  | "blastCampaignDurationMinutes"
  | "blastCampaignDurationHours"
  | "blastCampaignDurationDays"
  | "blastCampaignAudience"
  | "blastCampaignAudienceManual"
  | "blastCampaignAudienceProject"
  | "blastCampaignAudienceCsv"
  | "blastCampaignCsvUpload"
  | "blastCampaignCsvChooseFile"
  | "blastCampaignCsvPhoneCount"
  | "blastCampaignCsvRequired"
  | "blastCampaignAudienceProjectLabel"
  | "blastCampaignAudienceBoardLabel"
  | "blastCampaignAudienceColumnLabel"
  | "blastCampaignAudienceCardFiltersHint"
  | "blastCampaignSequence"
  | "blastCampaignAddStep"
  | "blastCampaignStep"
  | "blastCampaignSteps"
  | "blastCampaignSent"
  | "blastCampaignDelay"
  | "blastCampaignMessagePlaceholder"
  | "blastCampaignSkipIfReplied"
  | "blastCampaignStart"
  | "blastCampaignPause"
  | "blastCampaignCancel"
  | "blastCampaignTransportBaileys"
  | "blastCampaignTransportCloud"
  | "blastCampaignStepMode"
  | "blastCampaignStepModeFreeform"
  | "blastCampaignStepModeTemplate"
  | "blastCampaignTemplate"
  | "blastCampaignSelectTemplate"
  | "blastCampaignNoTemplates"
  | "blastCampaignTemplateRequired"
  | "blastCampaignCloudTemplateOnlyHint"
  | "blastCampaignTemplateVars"
  | "blastCampaignVarCrmField"
  | "blastCampaignVarCrmFieldManual"
  | "blastCampaignVarDefault"
  | "blastCampaignVarDefaultPlaceholder"
  | "blastCampaignTemplatePreview"
  | "blastCampaignCrmFieldTitle"
  | "blastCampaignCrmFieldContactName"
  | "blastCampaignCrmFieldEmail"
  | "blastCampaignCrmFieldPhone"
  | "blastCampaignCrmFieldCompany"
  | "blastCampaignCrmFieldRole"
  | "blastCampaignCrmFieldIndustry"
  | "blastCampaignCrmFieldEstimateRevenue"
  | "blastCampaignCrmFieldMessage"
  | "blastCampaignNameRequired"
  | "blastCampaignSessionRequired"
  | "blastCampaignStepRequired"
  | "blastCampaignDailyLimitInvalid"
  | "blastCampaignDeleteConfirm"
  | "blastCampaignEdit"
  | "blastCampaignEditTitle"
  | "blastCampaignSave"
  | "blastCampaignUpdated"
  | "blastCampaignEditLimitedHint"
  | "blastCampaignPostSendTitle"
  | "blastCampaignPostSendHint"
  | "blastCampaignPostSendEnable"
  | "blastCampaignPostSendProject"
  | "blastCampaignPostSendBoard"
  | "blastCampaignPostSendColumn"
  | "blastCampaignPostSendSelectProject"
  | "blastCampaignPostSendSelectColumn"
  | "blastCampaignPostSendColumnsLoading"
  | "blastCampaignPostSendColumnRequired"
  | "blastCampaignPostSendCrmAudienceHint"
  | "blastCampaignPostSendSummary"
  | "blastCampaignFailed"
  | "blastCampaignRetryFailed"
  | "blastCampaignViewFailures"
  | "blastCampaignFailuresDialogTitle"
  | "blastCampaignFailuresDialogSubtitle"
  | "blastCampaignRetryOne"
  | "blastCampaignRetryOneSuccess"
  | "blastCampaignMoveContact"
  | "blastCampaignMoveContactConfirm"
  | "blastCampaignMoveContactSuccess"
  | "blastCampaignNoLinkedCard"
  | "blastCampaignFailedReasonUnknown"
  | "blastCampaignMoveAllFailed"
  | "blastCampaignMoveAllFailedSuccess"
  | "blastCampaignMoveAllFailedPartial"
  | "blastCampaignAttachmentsHint"
  | "blastCampaignAddAttachment"
  | "blastCampaignFromLibrary"
  | "blastCampaignAttachmentMax"
  | "blastCampaignAttachmentTooLarge"
  | "blastCampaignAttachmentInvalidType"
  | "blastCampaignAttachmentDropHint"
  | "blastCampaignAttachmentUploading"
  | "blastCampaignAttachmentUploadFailed"
  // API Token Scopes
  | "apiTokenScopesTitle"
  | "apiTokenPermissionsSelected"
  | "apiTokenScopesSelected"
  | "apiTokenPresetAssistant"
  | "apiTokenPresetReadAll"
  | "apiTokenPresetClear"
  | "apiTokenPresetSelectAll"
  | "apiTokenScopesHelperEmbedded"
  | "apiTokenScopesHelperDefault"
  // Scope group categories
  | "scopeCategoryWorkspaces"
  | "scopeCategoryProjects"
  | "scopeCategoryCards"
  | "scopeCategoryDocuments"
  | "scopeCategoryMeetings"
  | "scopeCategoryDashboard"
  // Scope labels
  | "scopeWorkspacesRead"
  | "scopeWorkspacesWrite"
  | "scopeProjectsRead"
  | "scopeProjectsWrite"
  | "scopeCardsRead"
  | "scopeCardsWrite"
  | "scopeDocumentsRead"
  | "scopeDocumentsWrite"
  | "scopeMeetingsRead"
  | "scopeTranscriptsRead"
  | "scopeDashboardRead"
  | "scopeTimeTrackerRead"
  | "scopeTimeTrackerWrite"
  // Scope descriptions
  | "scopeDescWorkspacesRead"
  | "scopeDescWorkspacesWrite"
  | "scopeDescProjectsRead"
  | "scopeDescProjectsWrite"
  | "scopeDescCardsRead"
  | "scopeDescCardsWrite"
  | "scopeDescDocumentsRead"
  | "scopeDescDocumentsWrite"
  | "scopeDescMeetingsRead"
  | "scopeDescTranscriptsRead"
  | "scopeDescDashboardRead"
  | "scopeDescTimeTrackerRead"
  | "scopeDescTimeTrackerWrite"
  | "integrationSetupPostSaveMessage"
  | "integrationLinkInstructionsFallback"
  | "integrationLinkKbdExample"
  | "integrationApiTokenLabel"
  // Wizard steps
  | "integrationWizardStep1Label"
  | "integrationWizardStep2Label"
  | "integrationWizardStep3Label"
  | "integrationWizardContinue"
  | "integrationWizardBack"
  | "integrationWizardReviewTitle"
  | "integrationWizardBotConfigLabel"
  | "integrationWizardLanguageConfigLabel"
  | "integrationWizardTokenMethodLabel"
  | "integrationWizardTokenMethodAuto"
  | "integrationWizardTokenMethodManual"
  | "integrationWizardScopesLabel"
  | "integrationWizardScopesCount"
  | "integrationWizardTokenConfigured"
  | "integrationWizardTokenReplace"
  | "integrationWizardScopeRequired"
  | "integrationWizardApiTokenRequired"
  | "integrationWizardBotTokenRequired"
  // MCP Connections
  | "mcpConnections"
  | "addConnection"
  | "testConnection"
  | "connectionHealthy"
  | "connectionDegraded"
  | "connectionUnhealthy"
  | "connectionUnknown"
  // Agents
  | "agents"
  | "createAgent"
  | "agentTypeSpecialized"
  | "agentTypeOrchestrator"
  | "systemPrompt"
  | "availableTools"
  | "modelConfig"
  | "temperature"
  | "maxSteps"
  // Workflows
  | "workflows"
  | "createWorkflow"
  | "stepName"
  | "variableMapping"
  // Chat
  | "selectAgent"
  | "sendMessage"
  | "confirmationRequired"
  | "approve"
  | "reject"
  | "whatsappLiteBindingCalendarAccessOverride"
  | "whatsappLiteBindingCalendarAccessOverrideHint"
  | "calendarAccessEnabledTitle"
  | "calendarAccessEnabledHint"
  | "calendarAccessCanListTitle"
  | "calendarAccessCanListHint"
  | "calendarAccessCanScheduleTitle"
  | "calendarAccessCanScheduleHint"
  | "calendarAccessScopeLabel"
  | "calendarAccessScopeOwnerTitle"
  | "calendarAccessScopeOwnerDescription"
  | "calendarAccessScopeWorkspaceTitle"
  | "calendarAccessScopeWorkspaceDescription"
  | "calendarAccessScopeUsersTitle"
  | "calendarAccessScopeUsersDescription"
  | "calendarAccessPickUsers"
  | "calendarAccessSelectedCountTemplate"
  | "calendarAccessSearchPlaceholder"
  | "calendarAccessEmptyResults"
  | "calendarAccessLoadingMore"
  | "calendarAccessGoogleCalendarsTitle"
  | "calendarAccessGoogleCalendarsHint"
  | "calendarAccessGoogleNotConnected"
  | "automationsHubNav"

export const workspaceSettingsTranslations = {
  english: {
    // Form fields
    workspaceName: "Workspace's name",
    companyName: "Company name",
    companyWebsite: "Company Website",
    domain: "Domain",
    workspaceNamespace: "Workspace namespace",
    workspaceNamespaceHint: "Unique across JSYNQ. Your workspace URL will be {url}.",
    workspaceNamespacePlaceholder: "your-workspace",
    workspaceNamespaceInvalid: "Use lowercase letters, numbers, and hyphens. Do not use --.",
    workspaceNamespaceReserved: "That namespace is reserved.",
    workspaceNamespaceTaken: "That namespace is already taken.",
    workspaceOwner: "Workspace owner",
    description: "Description",

    // Buttons
    cancel: "Cancel",
    save: "Save",
    copy: "Copy",

    // WhatsApp Lite (workspace)
    whatsappLiteNav: "WhatsApp",
    messagesSettingsNav: "Messages",
    smsLiteNav: "SMS",
    voiceCallsSettingsNav: "Voice calls",
    smsLiteTitle: "SMS numbers",
    smsLiteSubtitle: "Connect SMS numbers, configure AI agents, CRM automation, and inbound automations.",
    smsLiteSessions: "SMS numbers",
    smsLiteTabSessionsDesc: "Connect and manage SMS numbers (Twilio) for this workspace.",
    smsLiteAutomation: "Agents",
    smsLiteTabAutomationDesc: "AI agent per number, automatic negotiations, and follow-ups.",
    smsLiteRuleTemplates: "Automations",
    smsLiteTabFlowsDesc: "Visual rules with triggers and actions when SMS messages are received.",
    smsLiteBindingsTitle: "AI agent per number",
    smsLiteBindingsDesc: "Assign an agent to each number for automatic replies, negotiation creation, and follow-ups.",
    smsLiteBindingsEmpty: "No agent configured yet. Add one to enable AI replies and CRM automation on an SMS number.",
    smsLiteCreateBinding: "Add agent",
    smsLiteEditBinding: "Edit agent per number",
    smsLiteSession: "SMS number",
    smsLiteRuleTemplatesHint:
      "Build visual rules: when a message arrives, run actions such as move or copy a negotiation, assign the contact, or change conversation state. First matching automation wins.",
    smsLiteRuleTemplatesEmpty: "No automations yet. Create one to run actions when messages are received.",
    smsLiteRuleTemplatesAdd: "New automation",
    smsLiteRuleTemplatesNoSessionsLinked: "No number selected — this automation will not run until you edit it.",
    smsLiteRuleTemplatesPriority: "Priority",
    smsLiteSessionStatusActive: "Active",
    smsLiteSessionStatusDisabled: "Disabled",
    smsLiteSessionStatusPendingConfig: "Pending setup",
    smsLiteAddSession: "Add number",
    smsLiteEmptySessions: "No SMS numbers configured yet",
    smsLiteEmptySessionsHint: 'Click "Add number" to get started.',
    smsLiteActionsAriaLabel: "Actions",
    smsLiteSessionEnable: "Enable",
    smsLiteSessionDisable: "Disable",
    smsLiteSessionProvider: "Provider",
    smsLiteSessionCreatedAt: "Created",
    smsLiteEditSessionTitle: "Edit SMS number",
    smsLiteCreateSessionTitle: "Add SMS number",
    smsLiteSessionLabel: "Display name",
    smsLiteSessionLabelPlaceholder: "e.g. Sales support",
    smsLiteSessionFromNumber: "From number (Twilio)",
    smsLiteSessionFromNumberPlaceholder: "+15551234567",
    smsLiteSessionAccountSid: "Account SID",
    smsLiteSessionAccountSidPlaceholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    smsLiteSessionAccountSidKeepPlaceholder: "Leave empty to keep current value",
    smsLiteSessionAuthToken: "Auth token",
    smsLiteSessionAuthTokenPlaceholder: "Twilio auth token",
    smsLiteSessionAuthTokenKeepPlaceholder: "Leave empty to keep current value",
    smsLiteSessionNameRequired: "Enter a display name.",
    smsLiteSessionFromNumberRequired: "Enter the from number.",
    smsLiteSessionCredentialsRequired: "Enter Account SID and Auth Token.",
    smsLiteSessionUpdated: "SMS number updated.",
    smsLiteSessionCreated: "SMS number created.",
    smsLiteSessionEnabledToast: "SMS number enabled.",
    smsLiteSessionDisabledToast: "SMS number disabled.",
    smsLiteSessionDeleted: "SMS number deleted.",
    smsLiteDeleteSessionTitle: "Delete SMS number",
    smsLiteDeleteSessionConfirm: 'Are you sure you want to delete "{label}"? This action cannot be undone.',
    smsLiteBindingSessionSearch: "Search numbers…",
    smsLiteBindingSessionEmptyNoSessions: "No numbers available. Add one on the Numbers tab.",
    smsLiteSearchNoResults: "No results found.",
    smsLiteBindingAgentSearch: "Search agents…",
    smsLiteBindingAgentEmptyNoAgents: "No agents in this workspace.",
    smsLiteSelectSession: "Select a number…",
    smsLiteSelectAgent: "Select an agent…",
    smsLiteSelectProject: "Select a project…",
    smsLiteSelectColumn: "Select a column…",
    smsLiteBindingCreated: "Agent configuration created.",
    smsLiteBindingUpdated: "Agent configuration updated.",
    smsLiteBindingPaused: "Agent configuration paused.",
    smsLiteBindingResumed: "Agent configuration resumed.",
    smsLiteBindingDeleted: "Agent configuration deleted.",
    smsLiteDeleteBindingTitle: "Delete agent configuration",
    smsLiteDeleteBindingConfirm: "Are you sure you want to delete this configuration? This cannot be undone.",
    smsLiteBindingLeadProjectColumnRequired: "Select a project and column for the negotiation.",
    smsLiteFlowNameRequired: "Enter a flow name.",
    smsLiteFlowUpdated: "Flow updated.",
    smsLiteFlowCreated: "Flow created.",
    smsLiteFlowDeleted: "Flow deleted.",
    smsLiteDeleteFlowTitle: "Delete SMS flow",
    smsLiteDeleteFlowConfirm: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    smsLiteIntegrationCardDesc:
      "Send and receive SMS via Twilio. Manage conversations, automate replies, and track leads through SMS.",
    smsLiteIntegrationActivate: "Activate",
    smsLiteIntegrationActiveSessions: "{count} active number(s)",
    smsLiteIntegrationConfigure: "Configure",
    smsLiteIntegrationNewSession: "New number",
    smsLiteIntegrationWizardTitle: "Configure SMS — Twilio",
    smsLiteIntegrationWizardDesc: "Enter your Twilio credentials to enable sending and receiving SMS.",
    smsLiteIntegrationCreating: "Creating…",
    smsLiteIntegrationWebhookTitle: "Webhook URL",
    smsLiteIntegrationWebhookDesc: "Set this URL as the webhook in the Twilio console to receive SMS.",
    smsLiteIntegrationWebhookUrlLabel: "Webhook URL",
    smsLiteIntegrationCopyUrl: "Copy URL",
    smsLiteIntegrationWebhookCopied: "Webhook URL copied!",
    smsLiteIntegrationContinue: "Continue",
    smsLiteIntegrationSessionCreatedTitle: "Number created!",
    smsLiteIntegrationSessionCreatedDesc:
      'The number "{label}" was created successfully. You can manage SMS numbers in settings.',
    smsLiteIntegrationGoToSettings: "Go to settings",
    smsLiteIntegrationClose: "Close",
    instagramLiteNav: "Instagram",
    instagramLiteTitle: "Instagram accounts",
    instagramLiteSubtitle:
      "Manage your Instagram DM accounts. Add accounts, assign agents, and set up inbound automations.",
    instagramLiteIntegrationCardDesc:
      "Send and receive Instagram DMs via Unipile. Manage conversations, automate replies, and sync leads.",
    instagramLiteIntegrationActivate: "Add account",
    instagramLiteIntegrationActiveSessions: "{count} active account(s)",
    instagramLiteIntegrationConfigure: "Configure",
    instagramLiteIntegrationNewAccount: "New account",
    instagramLiteIntegrationAddAccount: "Add Instagram account",
    instagramLiteFreeAccountHint: "Free — your first Instagram account is included with your plan.",
    instagramLiteIntegrationAdding: "Redirecting…",
    instagramLiteIntegrationLabelPlaceholder: "e.g. Company Instagram",
    instagramLiteIntegrationLabelRequired: "Please enter a label for this account.",
    instagramLiteBillingActive: "Active",
    instagramLiteBillingPastDue: "Payment overdue",
    instagramLiteBillingFree: "Free",
    instagramLiteBillingCanceled: "Canceled",
    instagramLiteBillingPending: "Pending",
    instagramLitePaymentStillProcessing: "Payment is still being processed. Please wait a moment and try again.",
    instagramLiteConnectBillingBlocked:
      "Unable to connect this Instagram account right now. Please try again in a moment.",
    instagramLiteStatusConnected: "Connected",
    instagramLiteStatusPendingConnect: "Pending connection",
    instagramLiteStatusReconnectRequired: "Reconnect required",
    instagramLiteStatusDisabled: "Disabled",
    instagramLiteSessions: "Accounts",
    instagramLiteSessionsDesc: "Instagram accounts connected to this workspace.",
    instagramLiteAutomation: "Agents",
    instagramLiteAutomationDesc: "Assign an AI agent per Instagram account for automatic replies and CRM.",
    instagramLiteTemplates: "Automations",
    instagramLiteTemplatesDesc: "Visual inbound rules triggered by Instagram DMs.",
    instagramLiteNoSessions: "No Instagram accounts added yet.",
    instagramLiteUsernamePending: "Username not synced yet — reconnect if this persists.",
    instagramLiteSessionAccessTitle: "Instagram account access",
    instagramLiteSessionAccessDesc: "Control who can see conversations from",
    smsLiteSessionAccessTitle: "SMS number access",
    smsLiteSessionAccessDesc: "Control who can see conversations from",
    instagramLiteNoTemplates: "No Instagram automations created yet.",
    instagramLiteConnect: "Connect",
    instagramLiteReconnect: "Reconnect",
    instagramLiteSession: "Instagram account",
    instagramLiteBindingsEmpty:
      "No agent configured yet. Add one to enable AI replies and CRM automation on an Instagram account.",
    instagramLiteCreateBinding: "Add agent",
    messagingBindingNoAgentAssigned: "No agent assigned",
    messagingBindingScopeConversation: "One conversation only",
    messagingBindingScopeConversationHint:
      "This agent only replies in one chat. To answer every new conversation on this number, add an agent for the whole number.",
    messagingBindingAutoUpdate: "Auto-update",
    messagingBindingEditAria: "Edit agent binding",
    messagingBindingPauseAria: "Pause agent binding",
    messagingBindingResumeAria: "Resume agent binding",
    messagingBindingDeleteAria: "Delete agent binding",
    whatsappLiteTitle: "WhatsApp numbers",
    whatsappLiteSubtitle:
      "Connect WhatsApp numbers to your workspace. Each number can power inbox and automation bindings.",
    whatsappLiteSessions: "WhatsApp numbers",
    whatsappLiteAddSession: "Add WhatsApp number",
    whatsappLitePaidPlanRequired: "WhatsApp lines are available on paid plans. Upgrade to add a number.",
    whatsappLiteTransport: "Connection type",
    whatsappLiteTransportBaileys: "WhatsApp Web (QR code)",
    whatsappLiteTransportCloud: "Cloud API (official Meta)",
    whatsappLiteTransportBaileysHint: "Pair by scanning a QR code, like WhatsApp Web.",
    whatsappLiteTransportCloudHint:
      "Official Meta API — add your WABA credentials below. JSYNQ validates, registers the number with Meta, and connects webhooks automatically.",
    whatsappLiteCloudAddDesc:
      "Use the same WABA ID, Phone Number ID, and System User token from Meta Business Manager. Leave the PIN blank unless this number already has two-step verification.",
    whatsappLiteEmbeddedSignupDesc:
      "Sign in with Meta to pick the WhatsApp Business Account and number. JSYNQ registers it. If the number already has a two-step PIN, you'll enter it after Meta accepts the login.",
    whatsappLiteEmbeddedSignupContinue: "Continue with Meta",
    whatsappLiteEmbeddedSignupShowManual: "Enter WABA credentials manually",
    whatsappLiteEmbeddedSignupHideManual: "Hide manual credentials",
    whatsappLiteEmbeddedSignupMissingIds:
      "Meta did not return the WhatsApp Business Account or phone IDs. Complete Embedded Signup and try again.",
    whatsappLiteEmbeddedSignupFailed: "Could not complete Meta Embedded Signup.",
    whatsappLiteEmbeddedSignupPinTitle: "Two-step verification PIN",
    whatsappLiteEmbeddedSignupPinDesc:
      "This number already has a two-step verification PIN. Enter the 6-digit PIN from WhatsApp Manager.",
    whatsappLiteEmbeddedSignupPinSubmit: "Register number",
    whatsappLiteCloudSetupIntro:
      "Before saving, confirm the number is added and verified in WhatsApp Manager. JSYNQ will register it with Meta for you — no manual API call needed.",
    whatsappLiteCloudSetupStep1: "Add and verify the phone number in WhatsApp Manager (SMS or voice).",
    whatsappLiteCloudSetupStep2:
      "Copy WABA ID and Phone Number ID from Business Manager / Developers — not the +55 display number.",
    whatsappLiteCloudSetupStep3:
      "Paste your System User token and the 6-digit two-step verification PIN (existing or new).",
    whatsappLiteCloudSectionIds: "Meta identifiers",
    whatsappLiteCloudSectionSecrets: "Token & registration",
    whatsappLiteCloudWabaId: "WhatsApp Business Account ID",
    whatsappLiteCloudWabaIdHint: "WhatsApp Manager → Account overview, or Business Settings → WhatsApp accounts.",
    whatsappLiteCloudPhoneNumberId: "Phone number ID",
    whatsappLiteCloudPhoneNumberIdHint:
      "Meta for Developers → WhatsApp → API Setup. This is a numeric ID, not the phone number customers see.",
    whatsappLiteCloudAccessToken: "Access token",
    whatsappLiteCloudAccessTokenHint:
      "Permanent System User token with whatsapp_business_messaging and whatsapp_business_management. Stored encrypted — never shown again.",
    whatsappLiteCloudPin: "Two-step verification PIN",
    whatsappLiteCloudPinHint:
      "Leave blank if this number has no two-step verification. JSYNQ sets a PIN. If Meta already has one, enter that 6-digit PIN.",
    whatsappLiteCloudPinProgress: "{count}/6 digits",
    whatsappLiteCloudShowPin: "Show PIN",
    whatsappLiteCloudHidePin: "Hide PIN",
    whatsappLiteCloudMetaLink: "Open WhatsApp Manager → Phone numbers",
    whatsappLiteCloudConnectSaving: "Connecting & registering…",
    whatsappLiteCloudUpdateCredentials: "Update Cloud API credentials",
    whatsappLiteCloudUpdateTitle: "Update Cloud API credentials",
    whatsappLiteCloudUpdateDesc:
      "Re-enter the access token and PIN. JSYNQ re-validates with Meta and re-registers the number if needed.",
    whatsappLiteCloudUpdateSaving: "Updating credentials…",
    whatsappLiteCloudRegistered: "Cloud API number connected and registered with Meta",
    whatsappLiteCloudAlreadyRegistered: "Cloud API number connected (already registered with Meta)",
    whatsappLiteCloudUpdated: "Cloud API credentials updated",
    whatsappLiteCloudConnected: "Cloud API number connected",
    whatsappLiteCloudTemplatesTab: "Templates",
    whatsappLiteCloudTemplatesTitle: "Message templates",
    whatsappLiteCloudTemplatesDesc: "Meta-approved templates used to start conversations outside the 24-hour window.",
    whatsappLiteCloudTemplatesEmpty: "No templates yet. Sync with Meta or create a new one.",
    whatsappLiteCloudTemplatesSync: "Sync with Meta",
    whatsappLiteCloudTemplatesSynced: "{count} templates synced",
    whatsappLiteCloudTemplatesCreate: "New template",
    whatsappLiteCloudTemplateName: "Name",
    whatsappLiteCloudTemplateNameHint: "Lowercase, no spaces. Spaces become underscores automatically.",
    whatsappLiteCloudTemplateLanguage: "Language",
    whatsappLiteCloudTemplateCategory: "Category",
    whatsappLiteCloudTemplateHeader: "Header (optional)",
    whatsappLiteCloudTemplateHeaderType_NONE: "None",
    whatsappLiteCloudTemplateHeaderType_TEXT: "Text",
    whatsappLiteCloudTemplateHeaderType_IMAGE: "Image",
    whatsappLiteCloudTemplateHeaderType_VIDEO: "Video",
    whatsappLiteCloudTemplateHeaderType_DOCUMENT: "Document",
    whatsappLiteCloudTemplateHeaderTextPlaceholder: "Header text",
    whatsappLiteCloudTemplateHeaderUpload: "Upload sample file",
    whatsappLiteCloudTemplateHeaderUploadHint:
      "A sample is required by Meta to approve a media header. The actual media is chosen when sending.",
    whatsappLiteCloudTemplateBodyExamples: "Variable examples",
    whatsappLiteCloudTemplateBodyExamplesHint: "Sample values for each variable, required by Meta for approval.",
    whatsappLiteCloudTemplateBodyExamplePlaceholder: "Example value",
    whatsappLiteCloudTemplateButtons: "Buttons (optional)",
    whatsappLiteCloudTemplateButtonQuickReply: "Quick reply",
    whatsappLiteCloudTemplateButtonUrl: "Link",
    whatsappLiteCloudTemplateButtonText: "Button text",
    whatsappLiteCloudTemplateAddButton: "Add button",
    whatsappLiteCloudTemplateRemoveButton: "Remove button",
    whatsappLiteCloudTemplateBody: "Body",
    whatsappLiteCloudTemplateBodyHint:
      "Use {{1}}, {{2}} for variables filled in when sending. Line breaks are allowed in fixed text (max 2 in a row). Variable values cannot contain line breaks.",
    whatsappLiteCloudTemplateFooter: "Footer (optional)",
    whatsappLiteCloudTemplateCreated: "Template submitted to Meta for review",
    whatsappLiteCloudTemplateDeleted: "Template deleted",
    whatsappLiteCloudTemplateDeleteTitle: "Delete template",
    whatsappLiteCloudTemplateDeleteConfirm: 'Delete template "{name}"? This removes it from Meta too.',
    whatsappLiteCloudTemplateVarBindingsTitle: "CRM variable mapping (optional)",
    whatsappLiteCloudTemplateVarBindingsDesc:
      "Optional. Auto-fills variables in the inbox from CRM when the conversation is linked to a card. Without mapping, you fill values manually when sending.",
    whatsappLiteTemplateSettingsTitle: "Template settings",
    whatsappLiteTemplateSettingsSubtitle: "Configure parameters and variables for the selected template.",
    whatsappLiteTemplateIdentification: "Identification",
    whatsappLiteTemplateLanguageSection: "Language",
    whatsappLiteTemplateVarColumn: "Variable",
    whatsappLiteTemplateCrmFieldColumn: "CRM field",
    whatsappLiteTemplateVarsFound: "{count} variables found",
    whatsappLiteTemplatePrimaryLanguage: "Primary language",
    whatsappLiteTemplateSaveChanges: "Save changes",
    whatsappLiteTemplateUnsavedTitle: "Discard changes?",
    whatsappLiteTemplateUnsavedDesc: "You have unsaved changes. Close without saving?",
    whatsappLiteKeepEditing: "Keep editing",
    whatsappLitePreviewMessagePlaceholder: "Message",
    whatsappLiteCloudNoSessions: "Connect a Cloud API number first to manage templates.",
    whatsappLiteCloudSelectSession: "Number",
    whatsappLiteWorkspaceTemplatesTab: "Snippets",
    whatsappLiteWorkspaceTemplatesTabDesc:
      "Reusable message snippets for WhatsApp and SMS composers (type :shortcut in the composer).",
    messagingShortcutsNav: "Shortcuts",
    messagingShortcutsSubtitle:
      "Create reusable messages for WhatsApp and SMS. Team members can insert them from the composer flash button or by typing :shortcut.",
    messagingShortcutsSearchPlaceholder: "Search title or message…",
    messagingShortcutsSessionFilterLabel: "WhatsApp line",
    messagingShortcutsSessionFilterAll: "All lines",
    messagingShortcutsLoadingMore: "Loading more…",
    whatsappLiteWorkspaceTemplatesTitle: "Message snippets",
    whatsappLiteWorkspaceTemplatesDesc:
      "Saved messages with {{1}}, {{2}}… placeholders. Sent as normal text — no Meta approval. On official Cloud API numbers, only within the 24-hour customer service window.",
    whatsappLiteWorkspaceTemplatesEmpty: "No snippets yet.",
    whatsappLiteWorkspaceTemplatesCreate: "New snippet",
    whatsappLiteWorkspaceTemplateName: "Name",
    whatsappLiteWorkspaceTemplateNameHint: "Shown in pickers and autocomplete.",
    whatsappLiteWorkspaceTemplateShortcut: "Shortcut",
    whatsappLiteWorkspaceTemplateShortcutHint: "Optional. Type :shortcut in the composer to autocomplete this snippet.",
    whatsappLiteWorkspaceTemplateBody: "Message",
    whatsappLiteWorkspaceTemplateBodyHint: "Use {{1}}, {{2}}… for variables.",
    whatsappLiteWorkspaceTemplatePreview: "Preview",
    whatsappLiteWorkspaceTemplateEdit: "Edit snippet",
    whatsappLiteWorkspaceTemplateCreated: "Snippet created",
    whatsappLiteWorkspaceTemplateUpdated: "Snippet updated",
    whatsappLiteWorkspaceTemplateDeleted: "Snippet deleted",
    whatsappLiteWorkspaceTemplateDeleteTitle: "Delete snippet?",
    whatsappLiteWorkspaceTemplateDeleteConfirm: 'Delete the snippet "{name}"? This cannot be undone.',
    whatsappLiteWorkspaceTemplateAttachments: "Attachments",
    whatsappLiteWorkspaceTemplateAttachmentBadge: "{count} files",
    whatsappLiteLabel: "Display name",
    whatsappLiteRename: "Rename",
    whatsappLiteReconnectSession: "Reconnect WhatsApp number (saved pairing)",
    whatsappLiteReconnectStarted: "Reconnect started. Status should update within a few seconds.",
    whatsappLiteSessionAccessTitle: "WhatsApp number access",
    whatsappLiteSessionAccessDesc: "Choose who can access conversations from",
    messagingAclAccessDescTail: "and which actions they can take.",
    messagingAclScopeUserAssigned: "Assigned only",
    messagingAclScopeAll: "All conversations",
    messagingAclScopeRoleAssigned: "Only their own",
    messagingAclScopeRoleGroup: "Group conversations",
    messagingAclScopeRoleAll: "All conversations",
    whatsappLiteSessionSharingWith: "Sharing with",
    whatsappLiteSessionNoAccessYet: "No people added yet.",
    whatsappLiteSessionAddRole: "Add role",
    whatsappLiteSessionNoRolesToAdd: "No roles to add",
    whatsappLiteSessionCanEdit: "Can edit",
    whatsappLiteSessionCanView: "Can view",
    whatsappLiteSessionNeedUserOrRole: "Add at least one person or role before restricting access.",
    whatsappLiteSessionMakePublic: "Make visible to everyone",
    whatsappLiteSessionMakePrivate: "Save changes",
    whatsappLiteConnectQr: "Connect with QR",
    whatsappLiteDelete: "Remove WhatsApp number",
    whatsappLiteDeleteConfirmDescription:
      "This disconnects the number and deletes stored credentials for this WhatsApp number. This cannot be undone.",
    whatsappLiteQrTitle: "Scan QR code",
    whatsappLiteQrHelp: "Open WhatsApp on your phone → Settings → Linked devices → Link a device. Scan the code below.",
    whatsappLiteStatusDisconnected: "Disconnected",
    whatsappLiteStatusQrPending: "Awaiting QR",
    whatsappLiteStatusConnected: "Connected",
    whatsappLiteStatusBanned: "Restricted",
    whatsappLiteEmptySessions: "No WhatsApp numbers yet. Add one to get a QR pairing flow started.",
    whatsappLiteAutomation: "Agents",
    whatsappLiteTabSessionsDesc: "Connect and manage WhatsApp numbers for this workspace.",
    whatsappLiteTabAutomationDesc:
      "AI agent per number, automatic negotiations, follow-ups, and smart contact distribution.",
    whatsappLiteTabFlowsDesc: "Visual rules with triggers and actions when messages are received.",
    whatsappLiteBindingsTitle: "AI agent per number",
    whatsappLiteBindingsDesc:
      "Assign an agent to each number for automatic replies, CRM lead creation, and follow-ups.",
    whatsappLiteBindingsEmpty:
      "No agent configured yet. Add one to enable AI replies and CRM automation on a WhatsApp number.",
    whatsappLitePause: "Pause",
    whatsappLiteResume: "Resume",
    whatsappLiteRefresh: "Refresh",
    whatsappLiteEntityStatusActive: "Active",
    whatsappLiteEntityStatusPaused: "Paused",
    whatsappLiteEntityStatusDraft: "Draft",
    whatsappLiteEntityStatusRunning: "Running",
    whatsappLiteEntityStatusCompleted: "Completed",
    whatsappLiteEntityStatusCancelled: "Cancelled",
    whatsappLiteEntityStatusFailed: "Failed",
    whatsappLiteBindingModeAutoReply: "Auto-reply",
    whatsappLiteBindingModeFirstMessageOnly: "First message only",
    whatsappLiteBindingModeWorkflowTrigger: "Workflow trigger",
    whatsappLiteBindingScopeAllInbound: "All inbound messages",
    whatsappLiteCreateBinding: "Add agent",
    whatsappLiteAgent: "Agent",
    whatsappLiteAgentChannelHint:
      "Each binding must use an agent with the WhatsApp channel enabled. The runtime uses that agent for replies and automation.",
    whatsappLiteNoAgentsWithWhatsappChannel:
      "No agents with WhatsApp enabled were found. Enable WhatsApp on an agent in Automation, then refresh this page.",
    whatsappLiteSession: "WhatsApp number",
    whatsappLiteModeAutoReply: "Auto-reply",
    whatsappLiteMaxRepliesDay: "Max replies per day",
    whatsappLiteStopPolling: "Close",
    whatsappLiteConnectedAs: "Connected as {phone}",
    whatsappLitePickAgentSession: "Select an agent and a WhatsApp number.",
    whatsappLiteQrRequestFailed: "Could not load the QR code from the server.",
    whatsappLiteQrWaitingServer: "Waiting for the server to generate the pairing code…",
    whatsappLiteQrSlowHint:
      "This is taking longer than usual. Check that the workspace-backend WhatsApp service is running and that the number is in “awaiting QR” state. You can close this window and use Connect with QR again.",
    whatsappLiteQrPairingFailed:
      "WhatsApp closed the connection before a QR was shown. Remove this number in settings, ensure workspace-backend is running with a supported Node version, then add a new WhatsApp number.",
    whatsappLiteConnectModalTitle: "Add WhatsApp number",
    whatsappLiteConnectModalSubtitleBefore: "Connect and manage WhatsApp for the ",
    whatsappLiteConnectModalSubtitleAfter: " workspace.",
    whatsappLiteLabelPlaceholder: "E.g. Sales",
    whatsappLiteSyncHistoryTitle: "Synchronize conversation history",
    whatsappLiteSyncHistoryDesc: "Automatically synchronize previous conversation history",
    whatsappLiteWhatsAppWeb: "WhatsApp Web",
    whatsappLiteMetaApiOfficial: "Meta API Official",
    whatsappLiteMetaApiComingSoon: "Coming soon",
    whatsappLiteQrHelpBefore: "Open the WhatsApp app, go to Linked devices and tap ",
    whatsappLiteQrHelpHighlight: "Link a device",
    whatsappLiteQrHelpAfter: " on your phone",
    whatsappLiteQrConnectionFailed: "Could not establish the connection. Please refresh the QR code and try again.",
    whatsappLiteQrRefreshAria: "Refresh QR code",
    whatsappLiteConnectedTitle: "{name} is connected",
    whatsappLiteConnectedDesc: "You can now use WhatsApp in your workspace to provide support.",
    whatsappLiteSetupLaterHint: "You can also set up your number later in the settings.",
    whatsappLiteDoItLater: "Do it later",
    whatsappLiteDisconnectBannerTitle: "WhatsApp number disconnected",
    whatsappLiteDisconnectBannerBody: "{label} is disconnected. Reconnect it to keep conversations flowing.",
    whatsappLiteDisconnectBannerSeeLater: "See it later",
    whatsappLiteDisconnectBannerTakeAction: "Take action",
    whatsappLiteFinish: "Finish",
    whatsappLiteEditBinding: "Edit agent per number",
    whatsappLiteAutoCreateLead: "Create a negotiation automatically",
    whatsappLiteAutoCreateLeadHint:
      "When a new contact is not linked to a negotiation, create one in the project and column below. If this contact already has a negotiation in that project, that one is reused.",
    whatsappLiteBindingSendReply: "Allow automatic WhatsApp replies",
    whatsappLiteBindingSendReplyHint:
      "When enabled, the agent’s generated reply can be sent to the contact on WhatsApp for this number. Turn off to run the agent without sending messages.",
    whatsappLiteBindingSendReplyOn: "Auto-reply: on",
    whatsappLiteBindingSendReplyOff: "Auto-reply: off",
    whatsappLiteBindingAllowImageGeneration: "Allow image generation/editing",
    bindingPermissionsTitle: "What the agent may do beyond answering",
    bindingPermissionsHint:
      "By default the agent only answers this contact. Everything below is off for safety: whoever writes on this channel is outside your team.",
    bindingWorkspaceAccess: "Workspace data",
    bindingWorkspaceAccessHint:
      "Cards, projects and documents. With read, a contact can get this information by asking the agent.",
    bindingWorkspaceAccessNone: "No access",
    bindingWorkspaceAccessRead: "Read",
    bindingWorkspaceAccessReadWrite: "Read and change",
    bindingAllowMessagingOthers: "Message other contacts",
    bindingAllowMessagingOthersHint:
      "Lets the agent send WhatsApp messages to other numbers or conversations (e.g. notify a salesperson about a hot lead).",
    bindingAllowReadingOtherConversations: "See other conversations",
    bindingAllowReadingOtherConversationsHint:
      "Lets the agent list and read other contacts' WhatsApp conversations. Rarely needed: a contact could ask about other customers.",
    whatsappLiteBindingAllowImageGenerationHint:
      "When enabled, the agent can generate or edit images if the contact asks for one in the conversation. Each image has a real cost — leave off unless needed.",
    whatsappLiteBindingWorkspaceAccessTitle: "Workspace access on WhatsApp",
    whatsappLiteBindingWorkspaceAccessDesc:
      "By default, agents on WhatsApp cannot read or change internal workspace data (documents, cards, projects). Enable these options only for trusted contacts such as internal brokers.",
    whatsappLiteBindingAllowEnumeration: "Allow reading workspace data (documents, library, projects)",
    whatsappLiteBindingAllowEnumerationHint:
      "Unlocks read-only tools such as list_documents and get_document so the agent can answer from the full knowledge library — not only semantic search snippets.",
    whatsappLiteBindingAllowWrites: "Allow creating and updating workspace data",
    whatsappLiteBindingAllowWritesHint:
      "Also unlocks write tools (create/update cards, documents, etc.) from WhatsApp. Requires read access above. Use with caution on external contacts.",
    whatsappLiteBindingEnumerationOn: "Library read access: on",
    whatsappLiteBindingEnumerationOff: "Library read access: off",
    whatsappLiteBindingWritesOn: "Workspace writes: on",
    whatsappLiteBindingWritesOff: "Workspace writes: off",
    whatsappLiteAiAutomationRequiresPlan:
      "AI-powered WhatsApp automation (auto-replies, LLM routing, agent-written follow-ups) is not included in your current plan.",
    whatsappLiteFlowModalClose: "Close",
    whatsappLiteSelectPlaceholder: "Choose…",
    whatsappLiteLeadProject: "Project",
    whatsappLiteLeadProjectSearch: "Search projects…",
    whatsappLiteLeadProjectNoMatch: "No project matches that search.",
    whatsappLiteLeadCrmBoardsHint:
      "Then pick a CRM board and column. Boards of type CRM are listed first, including CRM pipelines inside kanban projects.",
    whatsappLiteLeadBoard: "Board",
    whatsappLiteLeadColumn: "Column (stage)",
    whatsappLiteLeadSource: "Origin label",
    whatsappLiteNoCrmProjects: "No CRM projects found in this workspace. Create a CRM project first.",
    whatsappLiteNoProjects: "No projects found in this workspace.",
    whatsappLitePickProjectColumn: "Select a project and column for the new negotiation.",
    whatsappLiteAutoLeadPriority: "Adjust negotiation priority from WhatsApp activity",
    whatsappLiteAutoLeadPriorityHint:
      "Lets the server nudge the negotiation priority (e.g. cold / warm / hot) from inbound engagement until workflows are available. Maps to the CRM priority field.",
    whatsappLiteBindingLeadLine: "Auto negotiation: project «{project}»",
    whatsappLiteBindingLeadOff: "Auto negotiation: off",
    whatsappLiteBindingPriorityOn: "Priority automation: on",
    whatsappLiteBindingPriorityOff: "Priority automation: off",
    whatsappLiteBindingUpdated: "Automation rule updated",
    crmLeadSyncEnabled: "Auto-update the linked negotiation",
    crmLeadSyncActivate: "Enable synchronization",
    crmLeadSyncEnabledHint:
      "After conversations (debounced), an AI agent updates the linked task (description, labels, phone, etc). Not every message: waits for a quiet window.",
    crmLeadSyncAgentLabel: "Sync agent",
    crmLeadSyncAgentInherit: "Same as inbound agent",
    crmLeadSyncInstructions: "What the agent may change",
    crmLeadSyncInstructionsPlaceholder:
      "e.g. Only refresh description and labels; never change deadline unless the contact confirms a date.",
    crmLeadSyncInstructionsHint:
      "Leave empty for sensible defaults (update only when there is new factual information).",
    crmLeadSyncAllowedFields: "Allowed fields",
    crmLeadSyncAllowedFieldsHint: "Unchecked fields must not be modified.",
    crmLeadSyncTriggers: "When to schedule sync",
    crmLeadSyncTriggerAfterReply: "After the agent replies",
    crmLeadSyncTriggerAfterInbound: "After each inbound message (debounced)",
    crmLeadSyncTriggerIdle: "When conversation goes idle",
    crmLeadSyncMinInterval: "Minimum interval (minutes)",
    crmLeadSyncMinIntervalHint: "Debounces updates so the lead is not rewritten on every message.",
    crmLeadSyncModel: "Model",
    crmLeadSyncFieldDescription: "Description",
    crmLeadSyncFieldLabels: "Labels",
    crmLeadSyncFieldEmail: "Email",
    crmLeadSyncFieldPhone: "Phone",
    crmLeadSyncFieldDeadline: "Deadline",
    crmLeadSyncFieldContactName: "Contact name",
    crmLeadSyncFieldCompany: "Company",
    crmLeadSyncFieldName: "Card title",
    crmLeadSyncFieldCustomFields: "Custom fields",
    whatsappLiteFollowupMaxHint: "1 = single message. Max 10.",
    whatsappLiteFollowupSendAtTime: "Send at (local time)",
    whatsappLiteFollowupSendAtTimeHint: "Sends at the next occurrence of this time (workspace timezone).",
    whatsappLiteFollowupRequireBusinessHours: "Only send during workspace business hours",
    whatsappLiteFollowupMessagesPlaceholder: "Add one message per step",
    whatsappLiteFollowupAddMessage: "Add message",
    whatsappLiteFollowupRemoveMessage: "Remove",
    whatsappLiteFollowupMessageN: "Message {{n}}",
    whatsappLiteFollowupUseAgentConversationHint:
      "The agent writes each follow-up from the conversation context (topic and last ask). Leave fixed messages empty for this. If AI cannot generate a message, no generic canned text is sent.",
    whatsappLiteFollowupAgentFallbackHint:
      "If left empty, falls back to another agent already used in this rule, or the conversation's assigned agent — but AI generation may not run at all without one of those.",
    whatsappLiteFollowupMessagesOptionalWithAiHint:
      "Optional here — any round without a fixed message below will be generated by the AI agent.",
    whatsappLiteFollowupScheduleFromConversation: "Schedule based on conversation date",
    whatsappLiteFollowupScheduleFromConversationHint:
      "AI extracts the event/due date from the chat (month-only → day 1, mid-year → June, etc.). Falls back to the delay above if no date is found.",
    whatsappLiteFollowupDaysBeforeEvent: "Days before the event",
    whatsappLiteFollowupOnEventDay: "On the event day",
    whatsappLiteFollowupEventOffsets: "Send this many rounds before the event",
    whatsappLiteFollowupEventOffsetsHint:
      'One or more offsets — e.g. 1 day before AND 30 minutes before send two separate follow-ups. Use 0 for "on the event".',
    whatsappLiteFollowupAddEventOffset: "Add another offset",
    whatsappLiteRuleTemplatesLinkedCardMode: "Match mode",
    whatsappLiteRuleTemplatesLinkedCardModeIn: "Is in…",
    whatsappLiteRuleTemplatesLinkedCardModeNotIn: "Is not in…",
    whatsappLiteRuleTemplatesLinkedCardHintNotIn:
      "Match if the linked CRM lead is outside all of these project/column rows (OR). No linked card also matches.",
    whatsappLiteOutboundSourceText: "Free text",
    whatsappLiteOutboundSourceShortcut: "Workspace shortcut",
    whatsappLiteOutboundSourceMeta: "Official Meta template",
    whatsappLiteOutboundPickTemplate: "Select template…",
    whatsappLiteOutboundTextPlaceholder: "Message text",
    whatsappLiteOutboundTextOptional: "Optional preview / fallback text",
    whatsappLiteOutboundTemplateHint:
      "Selecting a shortcut or Meta template fills the text. Shortcuts send as normal WhatsApp messages; Meta uses the official HSM when the Cloud API gateway is available (otherwise the preview text is sent).",
    whatsappLiteRuleTemplatesWhenLinkedCard: "Lead is in project / column…",
    whatsappLiteRuleTemplatesWhenNewLead: "New lead created",
    whatsappLiteRuleTemplatesWhenNewLeadFunnel: "New lead in funnel",
    whatsappLiteRuleTemplatesNewLeadScope: "New lead scope",
    whatsappLiteRuleTemplatesNewLeadScopeWorkspace: "Any funnel (workspace-wide)",
    whatsappLiteRuleTemplatesNewLeadScopeFunnel: "Specific funnel",
    whatsappLiteRuleTemplatesNewLeadWorkspaceHint:
      "Triggers when a brand-new CRM lead is created on this inbound—by session binding auto-create or by the Create CRM lead action in this same rule. Does not match when linking or reusing an existing card.",
    whatsappLiteRuleTemplatesNewLeadFunnelHint:
      "Triggers when a new lead card is created in the selected project, including when Create CRM lead in this rule would create one. Leave columns empty for any board column in that project.",
    whatsappLiteRuleTemplatesLinkedCardHint:
      "Match if the linked CRM lead is in any of these project/column rows (OR). Leave columns empty for any column in the project.",
    whatsappLiteRuleTemplatesLinkedCardRow: "Project/column {{n}}",
    whatsappLiteRuleTemplatesAnyColumn: "Any column",
    whatsappLiteRuleTemplatesAddLinkedCardOr: "Add project/column (OR)",
    whatsappLiteRuleTemplatesConditionsMatch: "Combine conditions",
    whatsappLiteRuleTemplatesMatchAll: "Match all (AND)",
    whatsappLiteRuleTemplatesMatchAny: "Match any (OR)",
    whatsappLiteFollowupEnabled: "Enable follow-up automation",
    whatsappLiteFollowupEnabledHint: "When the lead doesn't reply in time.",
    whatsappLiteFollowupAllowAgentScheduling: "Allow the agent to schedule follow-ups on request",
    whatsappLiteFollowupAllowAgentSchedulingHint:
      'Lets the agent schedule or reschedule this conversation\'s follow-up when asked in chat (e.g. "call me back in 5 minutes"), independent of the automatic schedule above.',
    whatsappLiteFollowupOnlyWhenLinkedCard: "Only when linked CRM card matches columns",
    whatsappLiteFollowupOnlyWhenLinkedCardHint:
      "Follow-ups are scheduled and sent only if the conversation's linked card is (or is not) in the selected project columns. Changing this cancels pending follow-ups.",
    whatsappLiteFollowupOnlyWhenLinkedCardNeedsProject:
      "Select at least one project for the follow-up column condition.",
    whatsappLiteFollowupMax: "Max follow-ups",
    whatsappLiteFollowupFirstDelay: "Send after",
    whatsappLiteFollowupFirstDelayValue: "Interval value",
    whatsappLiteFollowupSubsequentDelay: "Interval between follow-ups",
    whatsappLiteFollowupSubsequentDelayValue: "Interval value",
    whatsappLiteFollowupStopOnReply: "Stop follow-ups when the contact replies",
    whatsappLiteFollowupUseAgent: "Use AI agent to generate follow-up messages",
    whatsappLiteFollowupTimingModeAfter: "After a period",
    whatsappLiteFollowupTimingModeAt: "At a specific time",
    whatsappLiteMaxRepliesInvalid: "Enter a valid max replies per day (number ≥ 1).",
    whatsappLiteRuleTemplates: "Automations",
    whatsappLiteRuleTemplatesHint:
      "Build visual rules: when a message arrives, run actions such as move or copy a negotiation, assign the contact, or change conversation state. First matching automation wins.",
    whatsappLiteRuleTemplatesEmpty: "No automations yet. Create one to run actions when messages are received.",
    whatsappLiteRuleTemplatesAdd: "New automation",
    whatsappLiteRuleTemplatesName: "Name",
    whatsappLiteRuleTemplatesSessionsLabel: "WhatsApp numbers",
    whatsappLiteRuleTemplatesSessionsHint: "Selected numbers only.",
    whatsappLiteRuleTemplatesSessionsEmpty: "Connect a WhatsApp number first to use this automation.",
    whatsappLiteRuleTemplatesSessionsRequired: "Select at least one WhatsApp number.",
    whatsappLiteRuleTemplatesSessionsChoose: "Choose numbers…",
    whatsappLiteRuleTemplatesSessionsCountSelected: "{count} selected",
    whatsappLiteRuleTemplatesNoSessionsLinked: "No number selected — this automation will not run until you edit it.",
    whatsappLiteRuleTemplatesPriority: "Priority",
    whatsappLiteRuleTemplatesStatus: "Status",
    whatsappLiteRuleTemplatesStatusActive: "Active",
    whatsappLiteRuleTemplatesStatusPaused: "Paused",
    whatsappLiteRuleTemplatesRootJson: "Inbound rules",
    whatsappLiteRuleTemplatesJsonError: "Invalid JSON in rule DSL.",
    whatsappLiteRuleTemplatesCreateTitle: "Create WhatsApp automation",
    whatsappLiteRuleTemplatesEditTitle: "Edit WhatsApp automation",
    smsLiteRuleTemplatesCreateTitle: "Create SMS automation",
    smsLiteRuleTemplatesEditTitle: "Edit SMS automation",
    smsLiteTemplateFlowDragHint: "Drag conditions and actions to reorder. Use + between steps to add a condition.",
    smsLiteRuleTemplatesSessionsLabel: "SMS numbers",
    smsLiteRuleTemplatesSessionsHint: "Selected numbers only.",
    smsLiteRuleTemplatesSessionsEmpty: "Connect an SMS number first to use this automation.",
    smsLiteRuleTemplatesSessionsChoose: "Choose numbers…",
    smsLiteRuleTemplatesSessionsCountSelected: "{count} selected",
    smsLiteRuleTemplatesNumberSearch: "Search numbers…",
    smsLiteRuleTemplatesNumberNoMatch: "No numbers match your search.",
    smsLiteRuleTemplatesActionSendText: "Send fixed SMS message",
    smsLiteRuleTemplatesSendTextLabel: "SMS message text",
    instagramLiteRuleTemplatesCreateTitle: "Create Instagram automation",
    instagramLiteRuleTemplatesEditTitle: "Edit Instagram automation",
    instagramLiteTemplateFlowDragHint: "Drag actions to reorder.",
    instagramLiteRuleTemplatesSessionsLabel: "Instagram accounts",
    instagramLiteRuleTemplatesSessionsHint: "Selected accounts only.",
    instagramLiteRuleTemplatesSessionsEmpty: "Connect an Instagram account first to use this automation.",
    instagramLiteRuleTemplatesSessionsChoose: "Choose accounts…",
    instagramLiteRuleTemplatesSessionsCountSelected: "{count} selected",
    instagramLiteRuleTemplatesAccountSearch: "Search accounts…",
    instagramLiteRuleTemplatesAccountNoMatch: "No accounts match your search.",
    instagramLiteRuleTemplatesActionSendText: "Send fixed Instagram message",
    instagramLiteRuleTemplatesSendTextLabel: "Instagram message text",
    instagramLiteRuleTemplatesWhenComment: "Instagram comment on a post",
    instagramLiteRuleTemplatesWhenCommentAll: "Any post (including future posts)",
    instagramLiteRuleTemplatesWhenCommentSelected: "Selected posts",
    instagramLiteRuleTemplatesCommentTextMatch: "Comment text",
    instagramLiteRuleTemplatesCommentTextAny: "Any comment text",
    instagramLiteRuleTemplatesPostsBrowseAccount: "Browse posts from",
    instagramLiteRuleTemplatesPostsFilter: "Filter by caption",
    instagramLiteRuleTemplatesPostsEmpty: "No posts found for this account.",
    instagramLiteRuleTemplatesPostsLoadMore: "Load more posts",
    instagramLiteRuleTemplatesActionReplyToComment: "Reply on the comment",
    instagramLiteRuleTemplatesReplyLabel: "Reply text",
    whatsappLiteRuleTemplatesActionCreateLead: "Create CRM lead",
    whatsappLiteRuleTemplatesActionCreateContact: "Create contact",
    whatsappLiteRuleTemplatesActionStopFlow: "Finish flow",
    whatsappLiteRuleTemplatesStopFlowHint:
      "Ends this message here. Actions after this one do not run, and later automations do not run on this round. Actions before this one still run.",
    whatsappLiteRuleTemplatesCreateLeadSource: "Lead source (optional)",
    whatsappLiteRuleTemplatesCreateLeadHint:
      "Creates a negotiation (CRM card) in the selected project, board, and column. Also creates or links a workspace contact with name, phone, and channel identity. If the session binding already auto-creates leads, using both may create duplicate cards—prefer one or the other.",
    whatsappLiteRuleTemplatesCreateContactHint:
      "Creates or reuses a workspace contact from phone or Instagram username on this conversation. Display name alone is not enough to deduplicate contacts. Does not create a CRM negotiation card.",
    whatsappLiteRuleTemplatesSimulate: "Simulate",
    whatsappLiteRuleTemplatesSimulateTitle: "Dry-run automation",
    whatsappLiteRuleTemplatesSimMessage: "Sample inbound message",
    whatsappLiteRuleTemplatesSimInbound: "Inbound contact message count",
    whatsappLiteRuleTemplatesSimSession: "WhatsApp number (optional)",
    whatsappLiteRuleTemplatesSimOptionalNumber: "Any connected number",
    whatsappLiteRuleTemplatesSimNumberHint: "Leave as “any” unless you need to simulate using a specific inbox.",
    whatsappLiteRuleTemplatesSimClearNumber: "Clear selection",
    whatsappLiteRuleTemplatesNumberSearch: "Search numbers…",
    whatsappLiteRuleTemplatesNumberNoMatch: "No numbers match your search.",
    whatsappLiteRuleTemplatesSimMatched: "Matched — rule index: {index}",
    whatsappLiteRuleTemplatesSimNotMatched: "No rule matched.",
    whatsappLiteRuleTemplatesSimRuleIndex: "Rule index",
    whatsappLiteRuleTemplatesDelete: "Delete automation",
    whatsappLiteRuleTemplatesDeleteConfirm: "Delete this automation? Inbound routing will no longer use it.",
    whatsappLiteRuleTemplatesSaved: "Automation saved.",
    whatsappLiteRuleTemplatesCreated: "Automation created.",
    whatsappLiteRuleTemplatesWorkflowIntro:
      "Build rules top to bottom: when a message matches, the actions run in order. The first matching rule wins on the server.",
    whatsappLiteRuleTemplatesRuleTitle: "Rule {n}",
    whatsappLiteRuleTemplatesRemoveRule: "Remove rule",
    whatsappLiteRuleTemplatesAddRule: "Add another rule",
    whatsappLiteRuleTemplatesWhenLabel: "When (condition)",
    whatsappLiteRuleTemplatesWhenFirstInbound: "First message from the contact in this chat",
    whatsappLiteRuleTemplatesWhenContains: "Message text contains…",
    whatsappLiteRuleTemplatesWhenNotContains: "Message text does not contain…",
    whatsappLiteRuleTemplatesWhenRegex: "Message text matches regex",
    whatsappLiteRuleTemplatesWhenLlm: "LLM classifies message (advanced)",
    whatsappLiteRuleTemplatesWhenLlmConversation: "AI classifies conversation (advanced)",
    whatsappLiteRuleTemplatesWhenEventDateDaysAhead: "Event / move date is … days from today",
    whatsappLiteRuleTemplatesEventDateOpLabel: "Comparison",
    whatsappLiteRuleTemplatesEventDateDaysLabel: "Days",
    whatsappLiteRuleTemplatesEventDateMatchIfMissing: "Also match when no date is found in the conversation",
    whatsappLiteRuleTemplatesEventDateHint:
      "Extracts a date from the conversation (e.g. move-in date), then compares calendar days from today. Prefer this over asking the AI to count days.",
    whatsappLiteRuleTemplatesEventDateOpGt: "More than (>)",
    whatsappLiteRuleTemplatesEventDateOpGte: "At least (≥)",
    whatsappLiteRuleTemplatesEventDateOpLt: "Less than (<)",
    whatsappLiteRuleTemplatesEventDateOpLte: "At most (≤)",
    whatsappLiteRuleTemplatesEventDateOpEq: "Exactly (=)",
    whatsappLiteRuleTemplatesLlmConvPromptLabel: "Classification prompt",
    whatsappLiteRuleTemplatesLlmConvPromptPlaceholder:
      "Describe what the AI should look for in the conversation, e.g.: 'Classify if the conversation mentions a budget or quote request'",
    whatsappLiteRuleTemplatesContainsPhrase: "Phrase or keyword",
    whatsappLiteRuleTemplatesIgnoreCase: "Ignore upper/lowercase",
    whatsappLiteRuleTemplatesRegexPatternLabel: "Regex pattern",
    whatsappLiteRuleTemplatesLlmLabelsLabel: "Possible classifications (comma-separated)",
    whatsappLiteRuleTemplatesLlmLabelsDesc:
      "List all possible outcomes the AI can choose from, e.g.: pricing, support, complaint, other",
    whatsappLiteRuleTemplatesLlmResultsHint:
      "Each classification gets its own path. Anything that matches none of them uses Otherwise.",
    whatsappLiteRuleTemplatesLlmAddResult: "Add classification",
    whatsappLiteRuleTemplatesLlmTopPath: "Top path",
    whatsappLiteRuleTemplatesLlmMatchLabel: "Classification that triggers this rule",
    whatsappLiteRuleTemplatesLlmMatchDesc: "Which of the above classifications should activate this rule's actions",
    whatsappLiteRuleTemplatesLlmHintLabel: "Additional context for the AI (optional)",
    whatsappLiteRuleTemplatesLlmHintDesc:
      "Extra instructions to help the AI classify correctly, e.g.: 'Consider messages asking for prices as pricing'",
    whatsappLiteRuleTemplatesActionsLabel: "Then (actions)",
    whatsappLiteRuleTemplatesAddActionAgent: "+ Run agent",
    whatsappLiteRuleTemplatesAddActionMoveCard: "+ Move linked CRM card",
    whatsappLiteRuleTemplatesRemoveAction: "Remove action",
    whatsappLiteRuleTemplatesActionType: "Action",
    whatsappLiteRuleTemplatesSendReply: "Send agent reply to WhatsApp (when applicable)",
    whatsappLiteRuleTemplatesMoveProject: "CRM project (for the column list)",
    whatsappLiteRuleTemplatesMoveColumn: "Target column",
    whatsappLiteRuleTemplatesPickProject: "Choose a project…",
    whatsappLiteRuleTemplatesPickColumn: "Choose a column…",
    whatsappLiteRuleTemplatesGroupSearch: "Search groups…",
    whatsappLiteRuleTemplatesGroupNone: "None (reply to the contact)",
    whatsappLiteRuleTemplatesGroupNeedSession: "Enable a WhatsApp number for this automation first.",
    whatsappLiteRuleTemplatesChooseAgent: "Choose Agent",
    whatsappLiteRuleTemplatesPickAgent: "Choose an agent…",
    whatsappLiteRuleTemplatesAgentSearch: "Search agents…",
    whatsappLiteRuleTemplatesActionSearch: "Search actions…",
    whatsappLiteRuleTemplatesActionNoMatch: "No actions match your search.",
    whatsappLiteRuleTemplatesAgentNoMatch: "No agents match your search.",
    whatsappLiteRuleTemplatesNoAgentsInWorkspace: "No agents in this workspace yet.",
    whatsappLiteRuleTemplatesEditorAdvanced: "Edit as JSON",
    whatsappLiteRuleTemplatesEditorVisual: "Back to visual editor",
    whatsappLiteRuleTemplatesAdvancedHint: "For nested conditions or JSON imports.",
    whatsappLiteRuleTemplatesAdvancedJson: "Raw rule JSON",
    whatsappLiteRuleTemplatesUnsupported:
      "This template uses conditions the visual editor does not support yet. Fix JSON or simplify rules.",
    whatsappLiteRuleTemplatesValidationRule: "Add at least one rule.",
    whatsappLiteRuleTemplatesValidationWhen: "Complete the condition fields for each rule.",
    whatsappLiteRuleTemplatesValidationWhenChatTypeOr:
      "“Chat is…” cannot be combined with other conditions using OR — use AND, or put chat type alone.",
    whatsappLiteRuleTemplatesValidationWhenLlmRequiresPlan:
      "LLM-based conditions are not available on your current plan. Change the “when” condition or upgrade to save.",
    whatsappLiteRuleTemplatesValidationAction:
      "Each action needs required fields: agent, column, message/template, or AI follow-up content.",
    whatsappLiteRuleTemplatesActionExecuteAgent: "Run workspace agent",
    whatsappLiteRuleTemplatesActionMoveCard: "Move linked negotiation",
    whatsappLiteRuleTemplatesActionCloneCard: "Copy negotiation to a board",
    whatsappLiteRuleTemplatesActionSendText: "Automatic reply",
    whatsappLiteRuleTemplatesActionScheduleFollowup: "Schedule follow-up messages",
    whatsappLiteRuleTemplatesActionAddLabel: "Add label to card",
    whatsappLiteRuleTemplatesActionSetLeadSource: "Set lead source",
    whatsappLiteRuleTemplatesActionTransitionState: "Change conversation state",
    whatsappLiteRuleTemplatesActionDisableAutoReply: "Block automatic replies",
    whatsappLiteRuleTemplatesActionEnableConversationAgent: "Enable AI agent on conversation",
    whatsappLiteRuleTemplatesDisableAutoReplyHint:
      "Pauses AI auto-replies for this lead (human handoff). Follow-ups are cancelled.",
    whatsappLiteRuleTemplatesEnableConversationAgentHint:
      "Sets the agent for this conversation on every new inbound message (like /agent on in chat). You can change it later in the inbox.",
    whatsappLiteRuleTemplatesActionDistributeLead: "Distribute lead (CRM + assignee)",
    whatsappLiteRuleTemplatesActionAssignConversation: "Assign conversation",
    whatsappLiteRuleTemplatesActionRouteToCrm: "Route to CRM column",
    whatsappLiteRuleTemplatesAssignUserOptional: "Assign to (optional)",
    whatsappLiteRuleTemplatesAssignUserPlaceholder: "Leave empty for smart distribution",
    whatsappLiteRuleTemplatesAssignUserHint: "Pick a teammate, or use smart distribution with the rules below.",
    whatsappLiteRuleTemplatesAssignUserRoundRobin: "Smart distribution (rules below)",
    whatsappLiteRuleTemplatesAssignUserSearch: "Search members…",
    whatsappLiteRuleTemplatesLabelText: "Label name",
    whatsappLiteRuleTemplatesLabelTextPlaceholder: "e.g. Budget, VIP, Urgent…",
    whatsappLiteRuleTemplatesLabelColor: "Label color",
    whatsappLiteRuleTemplatesLeadSourceText: "Lead source name",
    whatsappLiteRuleTemplatesLeadSourcePlaceholder: "e.g. WhatsApp Inbound, Referral…",
    whatsappLiteRuleTemplatesTransitionStateLabel: "Target state",
    whatsappLiteRuleTemplatesTransitionStateStopsAutoReply:
      "This state will stop automatic AI responses for this lead.",
    whatsappLiteConvStateNewLead: "New lead",
    whatsappLiteConvStateQualifying: "Qualifying",
    whatsappLiteConvStateWaitingResponse: "Waiting for response",
    whatsappLiteConvStateNegotiating: "Negotiating",
    whatsappLiteConvStateHumanHandoff: "Human handoff (stops auto-reply)",
    whatsappLiteConvStateFollowup: "Follow-up",
    whatsappLiteConvStateWon: "Won",
    whatsappLiteConvStateLost: "Lost",
    whatsappLiteConvStateBlocked: "Blocked",
    whatsappLiteConvStateIdle: "Idle",
    whatsappLiteRuleTemplatesFollowupMessages: "Follow-up messages",
    whatsappLiteRuleTemplatesFollowupMessagesHint: "Add one message per step (spaces allowed).",
    whatsappLiteRuleTemplatesAddActionSendText: "+ Send fixed message",
    whatsappLiteRuleTemplatesAddActionFollowup: "+ Schedule follow-ups",
    whatsappLiteRuleTemplatesSendTextLabel: "Message text",
    whatsappLiteRuleTemplatesSendTextHint: "Sent as plain text when the rule matches (no AI).",
    whatsappLiteRuleTemplatesSendTextChainHint:
      "For several messages in a row (1st reply, 2nd reply, …), tap «Add step» (+) and add «Send fixed message» again. Steps run from left to right.",
    whatsappLiteRuleTemplatesConditionLabel: "Condition",
    whatsappLiteRuleTemplatesConditionAndHint: "All conditions must be true (AND).",
    whatsappLiteRuleTemplatesWhenSearch: "Search conditions…",
    whatsappLiteRuleTemplatesWhenNoMatch: "No conditions found.",
    whatsappLiteTemplateFlowAddCondition: "Condition",
    whatsappLiteTemplateFlowAddActionMenu: "Action",
    whatsappLiteTemplateFlowEndTitle: "Add",
    whatsappLiteTemplateFlowDragHint: "Drag conditions and actions to reorder. Use + between steps to add a condition.",
    whatsappLiteTemplateFlowInspectorTitle: "Step details",
    whatsappLiteTemplateFlowInspectorEmpty: "Select a step on the canvas.",
    whatsappLiteTemplateFlowTabFlow: "Visual flow",
    whatsappLiteTemplateFlowTabJson: "JSON",
    whatsappLiteTemplateFlowRulesSidebar: "Rules",
    whatsappLiteTemplateFlowNodeTriggerHeader: "Trigger (when)",
    whatsappLiteTemplateFlowTriggerEvent: "Event",
    whatsappLiteTemplateFlowTriggerInbound: "Message received",
    whatsappLiteTemplateFlowTriggerSent: "Message sent (human or conversation agent)",
    whatsappLiteTemplateFlowTriggerTemplateSent: "Template sent",
    whatsappLiteTemplateFlowTriggerComment: "Comment received",
    whatsappLiteTemplateFlowCommentTriggerHint:
      "This already runs when someone comments. Add a condition only for an extra filter, such as the comment text. Choose which posts below.",
    whatsappLiteTemplateFlowAddBranch: "Add condition branch",
    whatsappLiteTemplateFlowTriggerTextOp: "Text filter",
    whatsappLiteTemplateFlowTriggerTextContains: "Contains",
    whatsappLiteTemplateFlowTriggerTextNotContains: "Does not contain",
    whatsappLiteTemplateFlowTriggerTextNone: "Any text",
    whatsappLiteTemplateFlowTriggerInspectorHint:
      "This card is the Event selected above. Add text filters and other conditions on the canvas — not in the header.",
    whatsappLiteTemplateFlowInsertCondition: "Add condition here",
    whatsappLiteTemplateFlowBranchYes: "Yes",
    whatsappLiteTemplateFlowBranchNo: "No",
    whatsappLiteTemplateFlowOtherwise: "Otherwise",
    whatsappLiteTemplateFlowOtherwiseHint:
      "Otherwise runs when this condition does not match. A classifier gets one path per label, and anything left over uses Otherwise.",
    whatsappLiteTemplateFlowNodeConditionHeader: "Condition {n}",
    whatsappLiteTemplateFlowNodeActionHeader: "Action {n} (step)",
    whatsappLiteTemplateFlowConfigValid: "Valid settings",
    whatsappLiteTemplateFlowConfigIncomplete: "Needs setup",
    whatsappLiteTemplateFlowCloseInspector: "Close step panel",
    whatsappLiteDelayUnitMinutes: "Minutes",
    whatsappLiteDelayUnitHours: "Hours",
    whatsappLiteDelayUnitDays: "Days",
    whatsappLiteDelayUnitWeeks: "Weeks",
    whatsappLiteDelayUnitMonths: "Months",
    whatsappLiteSlaTitle: "Response Time SLA",
    whatsappLiteSlaDescription: "Set warning and critical thresholds for unanswered conversations.",
    whatsappLiteSlaEnabled: "Enable SLA monitoring",
    whatsappLiteSlaWarning: "Warning after",
    whatsappLiteSlaCritical: "Critical after",
    whatsappLiteSlaMinutes: "min",
    whatsappLiteSlaSaved: "SLA settings saved.",
    whatsappLiteSlaDefault: "Default",
    whatsappLiteSlaAddColumn: "Add column rule",
    whatsappLiteSlaProject: "Project",
    whatsappLiteSlaColumn: "Column",
    whatsappLiteSlaRemoveRule: "Remove",
    whatsappLiteSlaColumnRules: "Column-specific rules",
    whatsappLiteOutboundNamePrefixTitle: "Attendant name on messages",
    whatsappLiteOutboundNamePrefixDescription:
      "Automatically add the attendant name in bold at the start of every outbound message.",
    whatsappLiteOutboundNamePrefixEnabled: "Prefix messages with attendant name",
    whatsappLiteOutboundNamePrefixSaved: "Messaging settings saved.",
    whatsappLiteLinkedLeadInboxTitle: "Only conversations with a lead",
    whatsappLiteLinkedLeadInboxDescription:
      "Hides conversations without a linked card from the inbox and this number's list.",
    whatsappLiteLinkedLeadInboxEnabled: "Hide conversations without a lead card",
    whatsappLiteLinkedLeadInboxSaved: "Messaging settings saved.",
    messagingSlaTitle: "Response Time SLA",
    messagingSlaDescription: "Set warning and critical thresholds for unanswered conversations.",
    messagingSlaDefault: "Default",
    messagingSlaWarning: "Warning after",
    messagingSlaCritical: "Critical after",
    messagingSlaMinutes: "min",
    messagingSlaColumnRules: "Column-specific rules",
    messagingSlaAddColumn: "Add column rule",
    messagingSlaProject: "Project",
    messagingSlaColumn: "Column",
    messagingSlaRemoveRule: "Remove",
    messagingSlaSaved: "SLA settings saved.",
    messagingOutboundNamePrefixTitle: "Attendant name on messages",
    messagingOutboundNamePrefixDescription:
      "Automatically add the attendant's name at the start of every outbound message.",
    messagingOutboundNamePrefixEnabled: "Prefix messages with attendant name",
    messagingOutboundNamePrefixSaved: "Messaging settings saved.",
    blastCampaignsTab: "Campaigns",
    blastCampaignsTitle: "Blast Campaigns",
    blastCampaignsDescription: "Send sequenced messages to multiple contacts",
    blastCampaignsCreate: "New Campaign",
    blastCampaignsEmpty: "No campaigns yet. Create one to get started.",
    blastCampaignCreated: "Campaign created",
    blastCampaignName: "Campaign name",
    blastCampaignDescription: "Description (optional)",
    blastCampaignSession: "WhatsApp number",
    blastCampaignSelectSession: "Select WhatsApp number…",
    blastCampaignDailyLimit: "Daily limit",
    blastCampaignInterval: "Interval (sec)",
    blastCampaignCustomInterval: "Enable custom sending interval",
    blastCampaignCustomIntervalHint: "Milliseconds between messages. Minimum 50, maximum 5000.",
    blastCampaignIntervalMs: "Interval (ms)",
    blastCampaignIntervalInvalid: "Interval must be between 50 and 5000 milliseconds.",
    blastCampaignSecondsIntervalInvalid: "Interval must be between 5 and 3600 seconds.",
    blastCampaignIntervalNeedsSession: "Select a WhatsApp number to set the interval.",
    blastCampaignEstimatedDuration: "Estimated duration: {duration}",
    blastCampaignEstimatedLeft: "about {duration} left",
    blastCampaignDurationSeconds: "{count} sec",
    blastCampaignDurationMinutes: "{count} min",
    blastCampaignDurationHours: "{count} h",
    blastCampaignDurationDays: "{count} d",
    blastCampaignAudience: "Audience source",
    blastCampaignAudienceManual: "Manual (add later)",
    blastCampaignAudienceProject: "From project",
    blastCampaignAudienceCsv: "CSV upload",
    blastCampaignCsvUpload: "Upload phone list",
    blastCampaignCsvChooseFile: "Choose file",
    blastCampaignCsvPhoneCount: "phone(s) found",
    blastCampaignCsvRequired: "Please upload a CSV file with phone numbers.",
    blastCampaignAudienceProjectLabel: "Project",
    blastCampaignAudienceBoardLabel: "Board",
    blastCampaignAudienceColumnLabel: "Column",
    blastCampaignAudienceCardFiltersHint: "Optional. Same filters as the project board.",
    blastCampaignSequence: "Message Sequence",
    blastCampaignAddStep: "Add step",
    blastCampaignStep: "Step",
    blastCampaignSteps: "steps",
    blastCampaignSent: "sent",
    blastCampaignDelay: "Delay (hours)",
    blastCampaignMessagePlaceholder: "Message content...",
    blastCampaignSkipIfReplied: "Skip if already replied",
    blastCampaignTransportBaileys: "Baileys",
    blastCampaignTransportCloud: "Meta Cloud API",
    blastCampaignStepMode: "Message type",
    blastCampaignStepModeFreeform: "Free message",
    blastCampaignStepModeTemplate: "Template",
    blastCampaignTemplate: "Template",
    blastCampaignSelectTemplate: "Select a template",
    blastCampaignNoTemplates: "No templates available for this number.",
    blastCampaignTemplateRequired: "Select a template for each template step.",
    blastCampaignCloudTemplateOnlyHint: "Cloud API numbers can only send Meta-approved templates in campaigns.",
    blastCampaignTemplateVars: "Variables",
    blastCampaignVarCrmField: "CRM field",
    blastCampaignVarCrmFieldManual: "Manual / default only",
    blastCampaignVarDefault: "Default value",
    blastCampaignVarDefaultPlaceholder: "Used when the CRM field is empty",
    blastCampaignTemplatePreview: "Preview",
    blastCampaignCrmFieldTitle: "Card title",
    blastCampaignCrmFieldContactName: "Contact name",
    blastCampaignCrmFieldEmail: "Email",
    blastCampaignCrmFieldPhone: "Phone",
    blastCampaignCrmFieldCompany: "Company",
    blastCampaignCrmFieldRole: "Role",
    blastCampaignCrmFieldIndustry: "Industry",
    blastCampaignCrmFieldEstimateRevenue: "Estimated revenue",
    blastCampaignCrmFieldMessage: "Message",
    blastCampaignStart: "Start",
    blastCampaignPause: "Pause",
    blastCampaignCancel: "Cancel",
    blastCampaignNameRequired: "Name is required",
    blastCampaignSessionRequired: "WhatsApp number is required",
    blastCampaignStepRequired: "At least one message step is required",
    blastCampaignDailyLimitInvalid: "Daily limit must be a positive number",
    blastCampaignDeleteConfirm: "This will permanently delete this campaign. This action cannot be undone.",
    blastCampaignEdit: "Edit campaign",
    blastCampaignEditTitle: "Edit campaign",
    blastCampaignSave: "Save changes",
    blastCampaignUpdated: "Campaign updated",
    blastCampaignEditLimitedHint: "Some messages were sent. Name, description, limit, and interval only.",
    blastCampaignPostSendTitle: "After each message is sent",
    blastCampaignPostSendHint: "Requires a linked CRM card.",
    blastCampaignPostSendEnable: "Move lead card to a column",
    blastCampaignPostSendProject: "CRM project",
    blastCampaignPostSendBoard: "Board",
    blastCampaignPostSendColumn: "Destination column",
    blastCampaignPostSendSelectProject: "Select project…",
    blastCampaignPostSendSelectColumn: "Select column…",
    blastCampaignPostSendColumnsLoading: "Loading columns…",
    blastCampaignPostSendColumnRequired: "Choose a destination column for the post-send action.",
    blastCampaignPostSendCrmAudienceHint: "Only for leads with a CRM card.",
    blastCampaignPostSendSummary: "moves card after send",
    blastCampaignFailed: "failed",
    blastCampaignRetryFailed: "Retry Failed",
    blastCampaignViewFailures: "View failed contacts",
    blastCampaignFailuresDialogTitle: "Failed contacts",
    blastCampaignFailuresDialogSubtitle:
      "See why each send failed, retry it, or move the contact's card to another column.",
    blastCampaignRetryOne: "Retry",
    blastCampaignRetryOneSuccess: "Contact queued for retry",
    blastCampaignMoveContact: "Move to column",
    blastCampaignMoveContactConfirm: "Move",
    blastCampaignMoveContactSuccess: "Card moved",
    blastCampaignNoLinkedCard: "No linked card to move",
    blastCampaignFailedReasonUnknown: "Unknown error",
    blastCampaignMoveAllFailed: "Move all {count} failed contacts to a column",
    blastCampaignMoveAllFailedSuccess: "Moved {count} card(s)",
    blastCampaignMoveAllFailedPartial: "Moved {moved} card(s), {failed} failed",
    blastCampaignAttachmentsHint:
      "Multiple files are sent as separate WhatsApp messages (max {count} per step, 20 MB each).",
    blastCampaignAddAttachment: "Upload file",
    blastCampaignFromLibrary: "From library",
    blastCampaignAttachmentMax: "Maximum {count} attachments per step",
    blastCampaignAttachmentTooLarge: "File exceeds 20 MB WhatsApp send limit",
    blastCampaignAttachmentInvalidType: "File type not allowed for blast campaigns",
    blastCampaignAttachmentDropHint: "Drag and drop files here, or use the attachment button",
    blastCampaignAttachmentUploading: "Uploading…",
    blastCampaignAttachmentUploadFailed: "Upload failed",
    workspaceNameRequired: "Workspace name is required",
    workspaceDetailsUpdated: "Workspace details updated successfully",
    businessHoursTitle: "Business hours",
    businessHoursDescription:
      "Define when your team is available. Used by WhatsApp inbound rules and other automations.",
    businessHoursEnabled: "Enable business hours",
    businessHoursTimezone: "Timezone",
    businessHoursAddWindow: "Add time slot",
    businessHoursRemoveWindow: "Remove",
    businessHoursStart: "From",
    businessHoursEnd: "To",
    businessHoursSaved: "Business hours saved",
    businessHoursMonday: "Monday",
    businessHoursTuesday: "Tuesday",
    businessHoursWednesday: "Wednesday",
    businessHoursThursday: "Thursday",
    businessHoursFriday: "Friday",
    businessHoursSaturday: "Saturday",
    businessHoursSunday: "Sunday",
    whatsappLiteRuleTemplatesWhenWithinBusinessHours: "During business hours",
    whatsappLiteRuleTemplatesWhenOutsideBusinessHours: "Outside business hours",
    whatsappLiteRuleTemplatesWhenChatType: "Chat is…",
    whatsappLiteRuleTemplatesDirectOnlyHint:
      'This rule has no "Chat type" condition, so it only matches direct messages — it will never fire in groups. Add a "Chat type" condition to include groups.',
    whatsappLiteRuleTemplatesWhenChatTypeDirect: "Direct (1:1)",
    whatsappLiteRuleTemplatesWhenChatTypeGroup: "Group",
    whatsappLiteRuleTemplatesWhenChatTypeAny: "Direct or group",
    whatsappLiteRuleTemplatesWhenChatTypeHint:
      "Combine with other conditions (AND) for group-only or direct-only automations. Rules without this condition stay direct-only.",
    whatsappLiteRuleTemplatesWhenChatTypeDisabled:
      "Group chat conditions are disabled while “Hide group messages” is on.",
    whatsappLiteRuleTemplatesWhenFromGroup: "Message is from group(s)",
    whatsappLiteRuleTemplatesWhenFromGroupMode: "Match",
    whatsappLiteRuleTemplatesWhenFromGroupLabel: "Group(s)",
    whatsappLiteRuleTemplatesWhenFromGroupHint: "Matches when the inbound message's group is one of the ones picked.",
    whatsappLiteRuleTemplatesWhenFromPhone: "Message is from phone number(s)",
    whatsappLiteRuleTemplatesWhenFromPhoneMode: "Match",
    whatsappLiteRuleTemplatesWhenFromPhoneLabel: "Phone number(s) / contact(s)",
    whatsappLiteRuleTemplatesWhenFromAd: "Came from a Click-to-WhatsApp ad",
    whatsappLiteRuleTemplatesWhenFromAdHint:
      "Only numbers connected through the official WhatsApp API receive the ad that brought the contact.",
    whatsappLiteRuleTemplatesWhenFromAdMatch: "Which ads",
    whatsappLiteRuleTemplatesWhenFromAdAny: "Any ad",
    whatsappLiteRuleTemplatesWhenFromAdIds: "Specific ads (ad IDs)",
    whatsappLiteRuleTemplatesWhenFromAdCampaigns: "Campaign is (campaign IDs)",
    whatsappLiteRuleTemplatesWhenFromAdCampaignsHint:
      "Needs the Meta Ads integration on the lead's project (campaign IDs come from Ads Manager).",
    whatsappLiteRuleTemplatesWhenFromAdHeadline: "Ad headline contains",
    whatsappLiteRuleTemplatesWhenFromAdScope: "Applies to",
    whatsappLiteRuleTemplatesWhenFromAdScopeMessage: "The message sent from the ad",
    whatsappLiteRuleTemplatesWhenFromAdScopeConversation: "Any message of a chat that came from an ad",
    whatsappLiteRuleTemplatesAdTokensHint:
      "Ad fields are filled when the chat came from a Click-to-WhatsApp ad; otherwise they stay empty.",
    whatsappLiteRuleTemplatesWhenFromPhoneHint: "Comma-separated. Any format works — only digits are compared.",
    whatsappLiteRuleTemplatesWhenModeIn: "Is one of",
    whatsappLiteRuleTemplatesWhenModeNotIn: "Is not one of",
    whatsappLiteRuleTemplatesActionSendToRecipients: "Send message to contacts",
    whatsappLiteRuleTemplatesRecipients: "Recipients",
    whatsappLiteRuleTemplatesRecipientAssignee: "Card assignee",
    whatsappLiteRuleTemplatesRecipientReporter: "Card reporter",
    whatsappLiteRuleTemplatesRecipientCardHint: "Only resolves when this conversation is linked to a CRM card.",
    whatsappLiteRuleTemplatesRecipientUsers: "Workspace users",
    whatsappLiteRuleTemplatesRecipientUsersPlaceholder: "Select users",
    whatsappLiteRuleTemplatesRecipientUsersSearch: "Search users…",
    whatsappLiteRuleTemplatesRecipientCustomPhones: "Custom phone numbers",
    whatsappLiteRuleTemplatesRecipientGroups: "Group(s)",
    whatsappLiteRuleTemplatesRecipientGroupsHint: "Pick one or more WhatsApp groups to notify.",
    whatsappLiteBindingAllowGroupAutoReply: "Also auto-reply in groups",
    whatsappLiteBindingAllowGroupAutoReplyHint:
      "Optional. Choose all groups for this number, or pick specific ones. This only controls agent auto-reply — it does not hide groups from the inbox. Requires “Show group messages in inbox” to be on.",
    whatsappLiteBindingGroupsPickRequired: "Select at least one group, or switch to “all groups”.",
    whatsappLiteBindingAllowGroupAll: "All groups for this number",
    whatsappLiteBindingAllowGroupPick: "Only selected groups",
    whatsappLiteBindingGroupsEmpty: "No groups found for this number yet. Open the inbox after joining groups.",
    whatsappLiteBindingGroupsDisabled: "Turn on “Show group messages in inbox” to configure group auto-reply.",
    whatsappLiteBindingGroupsLoading: "Loading inbox settings…",
    whatsappLiteRuleTemplatesSimChatType: "Simulate as…",
    whatsappLiteInboxHideGroupsAutomationHint:
      "If group chats are hidden in inbox settings, group automations and group auto-reply stay blocked — even if previously enabled.",
    failedToUpdateWorkspace: "Failed to update workspace details",

    letterheadTitle: "Letterhead",
    letterheadDescription: "Configure the header and footer for PDF documents generated by the agent.",
    letterheadEnabled: "Enable letterhead on PDFs",
    letterheadEnabledHint: "When enabled, agent-generated PDFs use this header and footer.",
    letterheadCompanyName: "Company name",
    letterheadCompanyNamePlaceholder: "Company name for the header",
    letterheadLogo: "Logo",
    letterheadLogoUpload: "Upload logo",
    letterheadLogoUploading: "Uploading…",
    letterheadLogoRemove: "Remove logo",
    letterheadLogoHint: "PNG or JPG. Uploaded logos are stored and used in generated PDFs.",
    letterheadPrimaryColor: "Primary color",
    letterheadInvalidColor: "Invalid primary color. Use hexadecimal format (#000000).",
    letterheadHeaderLayout: "Header layout",
    letterheadLayoutLeft: "Left (logo + name side by side)",
    letterheadLayoutCenter: "Centered",
    letterheadLayoutMinimal: "Minimal (no borders)",
    letterheadFooterText: "Footer text",
    letterheadFooterPlaceholder: "Tax ID: …, Phone: …, email@company.com",
    letterheadFooterHint: "Appears in the footer of all generated PDFs.",
    letterheadSaved: "Letterhead saved successfully.",
    letterheadSaveError: "Failed to save letterhead.",

    documentTemplatesTitle: "Document templates",
    documentTemplatesDescription:
      "Upload .docx or .html templates with placeholders for the agent to fill automatically.",
    documentTemplatesAdd: "Add",
    documentTemplatesName: "Template name",
    documentTemplatesNamePlaceholder: "e.g. Support hours report",
    documentTemplatesDescriptionOptional: "Description (optional)",
    documentTemplatesDescriptionPlaceholder: "Short description of the template",
    documentTemplatesCategory: "Category",
    documentTemplatesCategoryInvoice: "Invoice",
    documentTemplatesCategoryReport: "Report",
    documentTemplatesCategoryProposal: "Proposal",
    documentTemplatesCategorySupportHours: "Support hours",
    documentTemplatesCategoryContract: "Contract",
    documentTemplatesCategoryOther: "Other",
    documentTemplatesFile: ".docx or .html file",
    documentTemplatesSelectFile: "Select file",
    documentTemplatesPlaceholderHint:
      'Word: {placeholder}. HTML: data-slot="name" (or {{name}}) for fields the agent should fill.',
    documentTemplatesUpload: "Upload template",
    documentTemplatesUploading: "Uploading…",
    documentTemplatesUploadSuccess: "Template uploaded successfully!",
    documentTemplatesUploadError: "Failed to upload template",
    documentTemplatesUploadValidation: "Enter a name and select a .docx or .html file",
    documentTemplatesDeleteSuccess: "Template removed",
    documentTemplatesDeleteError: "Failed to remove template",
    documentTemplatesLoading: "Loading templates…",
    documentTemplatesEmpty: "No templates yet",
    documentTemplatesEmptyHint: "Upload a .docx or .html file for the agent to use as a template.",
    documentTemplatesFields: "Fields",
    documentTemplatesKindHtml: "HTML",
    documentTemplatesKindDocx: "Word",

    whatsappLiteBindingAutoReplyScope: "Auto-reply chats",
    whatsappLiteBindingAutoReplyScopeHint: "Choose whether the agent replies in direct chats, groups, or both.",
    whatsappLiteBindingAutoReplyScopeDirect: "Direct chats only",
    whatsappLiteBindingAutoReplyScopeGroup: "Groups only",
    whatsappLiteBindingAutoReplyScopeBoth: "Direct chats and groups",

    // Danger zone
    dangerZone: "Danger Zone",
    deleteWorkspace: "Delete my workspace",
    permanentlyDeleteWorkspace: "Permanently delete the workspace",
    changeWorkspaceLogo: "Change workspace logo",
    workspaceLogoAlt: "Workspace logo",
    customBrandingTitle: "Sidebar color",
    customBrandingDescription:
      "Set the accent color used in the sidebar gradient. Choose any color you like, or use the default to keep the JSYNQ theme.",
    customBrandingEnabled: "Use custom branding",
    customBrandingEnabledHint: "Applies your chosen accent color to the sidebar gradient.",
    customBrandingSidebarColor: "Accent color",
    customBrandingSidebarColorHint: "This color blends into the sidebar from top to bottom.",
    customBrandingUseDefaultColor: "Use default",
    customBrandingColorStyle: "Style",
    customBrandingColorStyleGradient: "Gradient",
    customBrandingColorStyleSolid: "Solid",
    customBrandingLogoHint:
      "Workspace logo is managed in Workspace settings — it appears on the sidebar when a custom accent color is set.",
    customBrandingSaved: "Sidebar color saved",
    customBrandingInvalidColor: "Enter a valid hex color (e.g. #45AD7E)",

    // General
    createdAt: "Created at",

    // Delete modal
    confirmAction: "Confirm action",
    deleteWorkspaceWarning:
      "If you delete your workspace, you will permanently lose your profile, projects, documents, and all work done.",
    deleteWorkspaceConfirmation: "Are you sure you want to delete {workspaceName}? This action cannot be undone.",
    typeDeleteToConfirm: "Type DELETE to confirm",
    deleteWorkspaceButton: "Delete Workspace",

    // Sidebar
    backToWorkspace: "Back to workspace",
    billing: "Billing",
    settings: "Settings",
    account: "Account",
    members: "Members",
    integrations: "Integrations",
    oauthApps: "OAuth apps",
    agentDigestNav: "Agent digest",
    calendarAccessGoogleNotConnected: "No Google Calendar connected for this workspace.",
    calendarAccessGoogleCalendarsHint: "Also read events from your connected Google account.",
    calendarAccessGoogleCalendarsTitle: "Include connected Google Calendars",
    calendarAccessLoadingMore: "Loading more…",
    calendarAccessEmptyResults: "Nothing found.",
    calendarAccessSearchPlaceholder: "Search…",
    calendarAccessSelectedCountTemplate: "{{count}} selected",
    calendarAccessPickUsers: "Search & select workspace members",
    calendarAccessScopeUsersDescription: "Pick which workspace members' meetings the agent can see.",
    calendarAccessScopeUsersTitle: "Specific people",
    calendarAccessScopeWorkspaceDescription: "Every workspace member's meetings.",
    calendarAccessScopeWorkspaceTitle: "Entire workspace",
    calendarAccessScopeOwnerDescription: "Only the agent owner's own meetings.",
    calendarAccessScopeOwnerTitle: "Just mine",
    calendarAccessScopeLabel: "Whose calendar",
    calendarAccessCanScheduleHint: "Check free/busy time and create, update, or cancel meetings.",
    calendarAccessCanScheduleTitle: "Check availability & schedule",
    calendarAccessCanListHint: "Administrative — see and enumerate existing meetings' details.",
    calendarAccessCanListTitle: "List meetings",
    calendarAccessEnabledHint: "Without this, the agent has no access to meetings or calendars at all.",
    calendarAccessEnabledTitle: "Enable calendar tools",
    whatsappLiteBindingCalendarAccessOverrideHint:
      "Use calendar permissions specific to this automation instead of the agent's own settings.",
    whatsappLiteBindingCalendarAccessOverride: "Override the agent's calendar access here",
    mcpConnections: "MCP Connections",

    // Billing
    planDetails: "Plan details",
    activeMembers: "You currently have {count} active {memberText} in your workspace.",
    member: "member",
    daysLeftInTrial: "({days} {dayText} left in trial)",
    day: "day",
    days: "days",
    currentPlan: "Current plan",
    addPaymentMethod: "Add payment method",
    managePlan: "Manage plan",
    contactSupportToSwitchPlans: "Contact support to switch to this plan",
    switchPlan: "Switch to this plan",
    switchPlanConfirmTitle: "Switch plan?",
    switchPlanConfirmDescription:
      "You're about to switch to {plan}. The price difference will be prorated and charged or credited immediately.",
    switchPlanSuccess: "Plan switched successfully.",
    switchPlanError: "Something went wrong while switching plans.",
    switching: "Switching...",
    confirm: "Confirm",
    downgradeInDevelopment: "Downgrade in development...",
    upgradeTo: "Upgrade to {plan} {interval}",
    downgradeTo: "Downgrade to {plan} {interval}",
    startTrial: "Start trial",
    oneTrialPerWorkspace: "* One trial per workspace. No reactivation after it ends.",
    startTrialModalTitle: "Start your free 14-day trial and unlock the full potential of JSYNQ.",
    startTrialModalSubtitle: "Reduce repetitive work and increase collaboration to maximize your team's impact",
    startTrialModalFeaturesHeading: "Unlock all JSYNQ Pro features:",
    startTrialModalFeatureAiIntegration: "AI integration",
    startTrialModalFeatureUnlimitedProjects: "Unlimited projects",
    startTrialModalFeaturePeoplePerMeeting: "100 people per meeting",
    startTrialModalFeaturePrivateTasks: "Private Tasks",
    startTrialModalFeatureUnlimitedRoles: "Unlimited roles",
    startTrialModalFeatureMeetingTranscripts: "Meeting transcripts",
    startTrialModalFeatureJsynqAi: "JSYNQ AI",
    startTrialModalFeaturePrioritySupport: "Priority support",
    startTrialModalFeatureAndMore: "And more",
    startTrialModalFeatureTimeInsights: "Advanced time insights",
    startTrialModalCancel: "Cancel",
    startTrialModalViewPlans: "View plans",
    startTrialModalStartFreeTrial: "Start free trial",
    startTrialModalPaymentTitle: "Add a payment method",
    startTrialModalPaymentSubtitle: "You won't be charged until your 14-day trial ends. Cancel anytime.",
    startTrialModalPaymentCardLabel: "Card information",
    startTrialModalBack: "Back",
    startTrialModalConfirmStartTrial: "Start free trial",
    startTrialModalSuccessTitle: "Your free trial has started",
    startTrialModalSuccessSubtitle: "You now have 14 days of full access to all paid features.",
    startTrialModalGotIt: "Got it!",
    startTrialModalGenericError: "Something went wrong. Please try again.",
    perUserPerMonth: "per user/month",
    perWorkspacePerMonth: "per workspace/month",
    flatRateForTeam: "Flat rate for your team ({seats} seats)",
    perUserPerYear: "per user/year",
    totalOf: "Total of",
    perMonth: "/month",
    perYear: "/year",
    months: "months",
    billedAnnually: "Billed annually",
    billedMonthly: "Billed monthly",
    freePlanMaxSeats: "Free plan allows a maximum of 5 members",
    reviewYourPlan: "Review your plan",
    myTeamHas: "My team has",
    membersLabel: "members",
    choose: "Choose",
    continueButton: "Continue",
    goBack: "Go back",
    back: "Back",
    whatsappLitePickMetaPixel: "Choose a Meta Pixel integration",
    whatsappLiteSendToMetaPixel: "Send to Meta Pixel",
    whatsappLiteSendToMetaPixelHint: "Report new auto-created leads as conversion events to a Meta Pixel.",
    whatsappLiteNoMetaPixelIntegrations: "No Meta Pixel integrations found in this project.",
    metaPixelIntegration: "Meta Pixel integration",
    metaPixelDefaultEventName: "Default event name",

    // Members
    invitations: "Invitations",
    failedInvitations: "Failed invitations",
    addMember: "Add Member",
    youCannotAddMoreMembers: "You cannot add more members",
    youCanOnlyAddUpTo: "You can only add up to {limit} members with the {plan} plan",
    membersWithThe: "members with the",
    plan: "plan",
    youDontHavePermissionToAddMembers: "You don't have permission to add members",
    user: "User",
    emailAddress: "Email address",
    role: "Role",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    you: "(You)",
    removeUser: "Remove user",
    disable: "Disable",
    thisUserWillBeRemovedFromAllProjects: "this user will be removed from all projects",

    // Invitations
    workspaceRole: "Workspace role",
    dateSent: "Date sent",
    dateUpdated: "Date Updated",
    noInvitationsFound: "No invitations found",
    noFailedInvitationsFound: "No failed invitations found",
    invitationSent: "Invitation sent",
    pendingFor: "Pending for {days} days",
    acceptedInvitedAt: "Accepted at {date}",
    removedInvitedAt: "Removed at {date}",
    rejectedInvitedAt: "Rejected at {date}",
    expiredInvitedAt: "Expired at {date}",
    canceledInvitedAt: "Canceled at {date}",
    allStatuses: "All statuses",
    statusPending: "Pending",
    statusAccepted: "Accepted",
    statusExpired: "Expired",
    statusCanceled: "Canceled",
    statusRejected: "Rejected",
    statusRemoved: "Removed",
    cancelInvitation: "Cancel invitation",
    invitationCanceled: "invitation canceled",
    invitationExpired: "invitation expired",
    invitationDeclined: "invitation declined",
    resendInvitation: "Resend invitation",
    removeFromList: "Remove from list",
    invitationSentSuccessfully: "invitation sent successfully",

    // Roles and permissions
    rolesAndPermissions: "Roles and permissions",
    search: "Search...",
    createNewRole: "Create new role",
    youCanOnlyCreateUpTo: "You can only create up to {limit} custom roles in {plan} plan",
    customRolesIn: "custom roles in",
    noRolesFound: "No roles found",
    edit: "Edit",
    delete: "Delete",
    youCanOnlyDeleteCustomRoles: "You can only delete custom roles",
    creatingNewRole: "Creating new role",
    saveChanges: "Save changes?",
    youHaveUnsavedChanges: "You have un-saved changes.",
    discardChanges: "Discard changes",
    monthly: "Monthly",
    yearly: "Yearly",
    quarterly: "Quarterly",
    semestral: "Semiannual",
    billedQuarterly: "Billed every 3 months",
    billedSemestrally: "Billed every 6 months",
    saveUpTo: "SAVE UP TO",
    saveUpToMessage: "Save up to {percentage}%{onYearlyPlan}",
    onYearlyPlan: " on the yearly plan",
    noMembers: "No members found",
    noPlan: "No plan",
    upgradeNow: "Upgrade now",
    startedPlan: "Started Plan",
    trial: "Trial",
    remaining: "remaining",
    youreCurrentlyOnTheFreeForeverPlan: "You're currently on the",
    foreverPlan: "forever plan.",
    free: "Free",
    upgradeForMore: "Upgrade for more",
    startYourFreeTrialNow: "Start your free trial now",
    editingRole: "Editing role",
    roleName: "Role name",
    roleNamePlaceholder: "Role name",
    workspace: "Workspace",
    projects: "Projects",
    timeTracker: "Time Tracker",
    documents: "Library",
    create: "Create",
    update: "Update",
    fullPermission: "Full permission",
    checkAll: "Check all",
    uncheckAll: "Uncheck all",
    rolesUiPeople: "People",
    rolesUiPeopleCount: "{count} people",
    rolesUiOnePerson: "1 person",
    rolesUiModulesWithAccess: "Modules with access",
    rolesUiPermissions: "Permissions",
    rolesUiAllModules: "All {count} modules",
    rolesUiNoModules: "No modules",
    rolesUiCountOf: "{count} of {total}",
    rolesUiModuleOff: "Module disabled",
    rolesUiFullArea: "Full permission in this area",
    rolesUiMarkAll: "Select all",
    rolesUiStandard: "Default",
    rolesUiCustom: "Custom",
    rolesUiLede:
      "A role groups what a person can do in each workspace module. Who sees each board is set in the project settings.",
    rolesUiSearchPermissions: "Search every area (e.g. lead, sprint, folder)",
    rolesUiOnlyActive: "Show only active",
    rolesUiResults: "{count} results",
    rolesUiApplyTemplate: "Apply template",
    rolesUiTemplateApplied: "{name} template applied: {count} permissions. Review before saving.",
    rolesUiTplViewer: "Only views projects, cards, documents and time.",
    rolesUiTplCommenter: "Views and comments on cards.",
    rolesUiTplCollaborator: "Works on cards, columns, CRM, products, documents and time.",
    rolesUiTplEditor: "Like Collaborator, plus creating projects and publishing documents.",
    rolesUiTplAdmin: "Every permission in the workspace.",
    rolesUiNone: "None",
    rolesUiReadOnly: "View only",
    rolesUiAll: "All",
    rolesUiActiveOfTotal: "{active} of {total} active",
    rolesUiRequires: "Requires “{label}”",
    rolesUiAlsoDisabled: "Also turned off {count} permissions that depend on “{label}”.",
    rolesUiAlsoEnabled: "Also turned on “{label}”, which this action needs.",
    rolesUiModuleGate:
      "This role does not have “{label}” (Workspace › Modules). The permissions below only apply once that access is on.",
    rolesUiTurnOnAccess: "Turn on access",
    rolesUiUnsaved: "{count} unsaved changes",
    rolesUiAllSaved: "All saved",
    rolesUiActiveCount: "{active} of {total} permissions on",
    rolesUiNoMatch: "No permission matches “{query}”.",
    rolesUiNoActive: "No active permissions in this area.",
    rolesUiVerbRead: "View",
    rolesUiVerbCreate: "Create",
    rolesUiVerbUpdate: "Edit",
    rolesUiVerbDelete: "Delete",
    rolesUiVerbAction: "Action",
    rolesUiAreas: "Permission areas",
    roleUpdatedSuccessfully: "Role updated successfully",
    loading: "Loading...",
    deleteRoleDialogTitle: 'Delete Role "{roleName}"',
    deleteRoleDialogConfirmQuestion: 'Delete role "{roleName}"?',
    deleteRoleDialogMustReassign: 'All members must be reassigned to a new role before deleting "{roleName}".',
    deleteRoleDialogAssignedToMemberCount: "This role is currently assigned to {count} members.",
    deleteRoleDialogMembersHeading: "Members",
    deleteRoleDialogChangeAllToLabel: "Change all to:",
    deleteRoleDialogSelectNewRole: "Select new role",
    deleteRoleDialogDeleting: "Deleting...",
    deleteRoleDialogDeleteRoleButton: "Delete Role",
    deleteRoleDialogReassignFailed: "Failed to delete role. Please try again.",
    deleteRoleDialogDeleteSuccessWithReassignment: 'Role "{roleName}" was deleted and members reassigned.',
    deleteRoleDialogDeleteSuccessNoMembers: 'Role "{roleName}" was deleted.',
    createNewWorkspace: "Create a new workspace",
    noWorkspacesFound: "No workspaces found.",
    clientWorkspacesSectionTitle: "Client workspaces",
    clientWorkspaceEnterError: "Couldn't open that workspace. Try again.",
    createWorkspaceDescription: "The space where your team collaborates, shares, and gets work done.",
    addImage: "Add image",
    changeImage: "Change image",
    language: "Language",
    selectLanguage: "Select language",
    createWorkspace: "Create workspace",
    workspaceSettings: "Workspace settings",
    private: "Private",
    cardExpiryExpired: "Card expiry date has expired",
    cardExpiryInvalid: "Please enter a valid expiry date (MM/YY)",
    paymentDetails: "Payment details",
    addNewCard: "Add a new card",
    cardInformation: "Card information",
    cardholderName: "Cardholder name",
    cardNumberPlaceholder: "1234 1234 1234 1234",
    cardExpiryPlaceholder: "MM/YY",
    cardCvcPlaceholder: "CVC",
    cardholderNamePlaceholder: "Full name on card",
    cardNumberInvalid: "Please enter a valid card number",
    cardCvcInvalid: "Please enter a valid CVC",
    cardholderNameRequired: "Please enter the cardholder name",
    failedToCreatePaymentMethod: "Failed to create payment method",
    failedToCreateWorkspace: "Failed to create workspace",
    workspaceCreationSuccess: "You're all set! Subscription is active",
    failedToCreatePaymentMethodOrWorkspace: "Failed to create payment method or workspace. Please try again.",
    endedIn: "Ended in",
    expiration: "Expiration",
    noSavedPaymentMethods: "No saved payment methods. Add a card to continue.",
    deletePaymentMethod: "Delete payment method",
    setDefaultPaymentMethod: "Set as default",
    defaultPaymentMethodBadge: "Default",
    saveCard: "Save card",
    billingPaymentMethods: "Payment methods",
    billingInvoices: "Invoices",
    billingCardsLoadError: "Failed to load payment methods.",
    billingInvoicesLoadError: "Failed to load invoices.",
    setDefaultPaymentMethodSuccess: "Default payment method updated.",
    deletePaymentMethodSuccess: "Payment method removed.",
    addPaymentMethodSuccess: "Card saved.",
    cannotDeleteOnlyPaymentMethod: "Add another card before removing the last one on file.",
    noInvoices: "No invoices yet.",
    viewInvoice: "View",
    downloadInvoice: "PDF",
    billingInvoiceNumber: "Invoice",
    billingInvoiceDate: "Date",
    billingInvoiceAmount: "Amount",
    billingInvoiceStatus: "Status",
    billingInvoiceActions: "Actions",
    billingViewMore: "View more",
    billingViewLess: "View less",
    cardExpiresOn: "Expires {month}/{year}",
    cardExpiredOn: "Expired {month}/{year}",
    invoiceStatusPaid: "Paid",
    invoiceStatusOpen: "Open",
    invoiceStatusDraft: "Draft",
    invoiceStatusVoid: "Void",
    invoiceStatusUncollectible: "Uncollectible",
    invoiceUntitled: "Invoice",
    deletePaymentMethodConfirm: "Remove the card ending in {last4}?",
    currentSubscription: "Current subscription",
    currentSubscriptionCustomHint: "This price is no longer in the public catalog. You can still manage it here.",
    choosePaymentMethod: "Choose a payment method to continue.",
    cardDeclinedFraudulent: "Your card was declined due to security reasons. Please use a different payment method.",
    cardDeclinedInsufficientFunds:
      "Your card has insufficient funds. Please check your account balance or use a different payment method.",
    cardDeclinedExpired: "Your card has expired. Please check the expiration date or use a different payment method.",
    cardDeclinedLost: "Your card was reported as lost. Please use a different payment method.",
    cardDeclinedStolen: "Your card was reported as stolen. Please use a different payment method.",
    cardDeclinedGeneric: "Your card was declined. Please check your card details or use a different payment method.",
    paymentFormNotReady: "Payment form is not ready. Please wait a moment.",
    checkPaymentDetails: "Please check your payment details",
    stripeKeyMissing: "Payment configuration is missing. Please contact support.",
    failedToCreateSetupIntent: "Failed to initialize payment. Please try again.",
    failedToInitializePaymentForm: "Failed to initialize payment form. Please try again.",
    paymentSetupError: "Payment Setup Error",
    // Review bill / onboarding
    reviewYourBill: "Review your bill",
    subtotal: "Subtotal",
    subtotalWithSeats: "Subtotal ({seats} seats)",
    addPromotionCode: "Add promotion code",
    promotionCode: "Promotion code",
    promotionCodePlaceholder: "Enter your code",
    apply: "Apply",
    discount: "Discount",
    removePromotionCode: "Remove promotion code",
    total: "Total",
    // Promotion code validation
    promotionCodeRequired: "Promotion code is required",
    failedToValidatePromotionCode: "Failed to validate promotion code",
    promotionCodeNotFoundOrInactive: "Promotion code not found or inactive",
    promotionCodeNotValidForAccount: "This promotion code is not valid for your account",
    promotionCodeSignInRequired: "This promotion code is restricted to a specific customer. Please sign in.",
    promotionCodeExpired: "Promotion code is no longer valid (expired or max redemptions reached)",
    promotionCodeWrongPlan: "This promotion code does not apply to the selected plan",
    promotionCodeWrongCurrency: "This promotion code applies to USD only, not BRL",
    promotionCodeNoPricingForCurrency: "This plan does not have pricing for this currency",
    promotionCodeFirstWorkspaceOnly: "This promotion code is only valid for your first workspace",
    promotionCodeFirstTimeSignInRequired: "This promotion code is for first-time workspace creators. Please sign in.",
    // Promotion code success messages
    discountSuccessRepeatingPercent: "{percent}% discount applied to the next {months} invoice(s).",
    discountSuccessRepeatingAmount: "{amount} discount applied to the next {months} invoice(s).",
    discountSuccessOncePercent: "{percent}% discount applied to the first invoice.",
    discountSuccessOnceAmount: "{amount} discount applied to the first invoice.",
    discountSuccessForeverPercent: "{percent}% recurring discount applied to all invoices.",
    discountSuccessForeverAmount: "{amount} recurring discount applied to all invoices.",
    // Auth pages
    welcomeBack: "Welcome back!",
    email: "E-mail",
    password: "Password",
    confirmPassword: "Confirm password",
    passwordsDoNotMatch: "Passwords do not match",
    forgotPassword: "Forgot your password?",
    signIn: "Sign in",
    or: "OR",
    continueWithGoogle: "Continue with Google",
    dontHaveAccount: "Still don't have an account?",
    signUp: "Sign up",
    emailOrPasswordInvalid: "Email or password are invalid.",
    somethingWentWrongTryAgain: "Something went wrong, please try again.",
    // Sign up page
    createAccountInSeconds: "Create an account in seconds!",
    secureYourAccount: "Secure your account with a password.",
    fullName: "Full Name",
    next: "Next",
    alreadyHaveAccount: "Already have an account?",
    byClickingButton: "By clicking the button above, you agree to our",
    iAgreeToThe: "I agree to the",
    termsOfService: "Terms of Service",
    and: "and",
    privacyPolicy: "Privacy Policy.",
    enterValidEmail: "Please enter a valid email address.",
    emailAlreadyRegistered: "This email is already registered. Try logging in or use a different email.",
    // Onboarding page metadata
    onboardingPageTitle: "JSYNQ - Onboarding",
    onboardingPageDescription: "Create your workspace by selecting a plan and setting up your team.",
    onboardingPlanPageTitle: "JSYNQ - Choose a plan",
    onboardingPlanPageDescription: "Select a plan before creating your workspace.",
    onboardingReviewPageTitle: "JSYNQ - Review your bill",
    onboardingReviewPageDescription: "Review your plan and apply a promotion code before payment.",
    onboardingPaymentPageTitle: "JSYNQ - Payment Details",
    onboardingPaymentPageDescription: "Select a payment method to complete your workspace setup.",
    onboardingPaymentDetailsPageTitle: "JSYNQ - Payment Details",
    onboardingPaymentDetailsPageDescription: "Enter your payment details to complete your workspace setup.",
    onboardingInviteMembersPageTitle: "JSYNQ - Invite Members",
    onboardingInviteMembersPageDescription: "Invite team members to collaborate in your workspace.",

    // Workspace integrations
    integrationPageSubtitle:
      "Connect and manage workspace integrations to extend functionality and automate workflows.",
    integrationAddTelegram: "Add Telegram integration",
    integrationLoading: "Loading integrations...",
    integrationConnectedTitle: "Connected Integrations",
    integrationActive: "Active",
    integrationInactive: "Inactive",
    integrationUpdated: "Updated",
    integrationOpen: "Open",
    integrationConfigure: "Configure",
    integrationGenerateLinkCode: "Generate link code",
    integrationEmptyTitle: "No workspace integrations yet",
    integrationEmptyBody: "Add your first integration to get started.",
    integrationDiscoverTitle: "Discover Integrations",
    integrationTelegramCardTitle: "Telegram",
    integrationTelegramCardDescription:
      "Connect Telegram at workspace level to enable secure read-only assistant queries for linked users.",
    clickupWsCardTitle: "ClickUp",
    clickupWsCardDescription:
      "Import multiple ClickUp lists at once. Each list becomes a new JSYNQ project with statuses, tasks, comments, attachments, and Docs in the Library.",
    clickupWsBtnManage: "Manage import",
    clickupWsConnectedStatus: "Import status: {status}",
    clickupWsConnectedSubtitle: "Bulk list import",
    clickupWsImportStartedToast:
      "Import started for {count} list(s). You can close this page — it keeps running in the background.",
    clickupWsStatus_processing: "Import in progress",
    clickupWsStatus_queued: "Import queued",
    clickupWsStatus_completed: "Import completed",
    clickupWsStatus_failed: "Import failed",
    clickupWsStatus_idle: "Ready to import",
    clickupWsModalTitle: "ClickUp workspace import",
    clickupWsModalIntro:
      "Connect ClickUp, pick a team and space, then select lists or folders. Each selected list is created as a project in this workspace.",
    clickupWsAuthentication: "Authentication",
    clickupWsAuthenticate: "Authenticate with ClickUp",
    clickupWsReauth: "Re-authenticate with ClickUp",
    clickupWsReauthHint: "Re-authenticate to browse ClickUp and import more lists.",
    clickupWsReauthOptional: "Re-authenticate only if the connection expired or you need a different ClickUp account.",
    clickupWsAuthenticating: "Authenticating...",
    clickupWsAuthenticated: "ClickUp authenticated",
    clickupWsSelectTeam: "ClickUp team (Workspace)",
    clickupWsChooseTeam: "Choose a team",
    clickupWsLoadingTeams: "Loading teams...",
    clickupWsSelectSpace: "Space",
    clickupWsChooseSpace: "Choose a space",
    clickupWsLoadingSpaces: "Loading spaces...",
    clickupWsSelectLists: "Lists and folders",
    clickupWsSelectAll: "Select all in space",
    clickupWsLoadingLists: "Loading lists...",
    clickupWsNoLists: "No lists found in this space.",
    clickupWsSelectedCount: "{count} list(s) selected",
    clickupWsImportButton: "Import {count} list(s) as projects",
    clickupWsImporting: "Importing...",
    clickupWsResults: "Import results",
    clickupWsDisconnect: "Disconnect ClickUp",
    clickupWsAuthFailed: "ClickUp authentication failed",
    clickupWsConnectFailed: "Failed to save ClickUp connection",
    clickupWsConnectedToast: "ClickUp connected to workspace",
    clickupWsImportFailed: "ClickUp import failed",
    clickupWsImportSuccess: "Imported {count} ClickUp list(s) as projects",
    clickupWsImportPartial: "Imported {ok} list(s); {failed} failed",
    clickupWsDisconnectFailed: "Failed to disconnect ClickUp",
    clickupWsDisconnectedToast: "ClickUp disconnected",
    clickupWsFailedTeams: "Failed to load ClickUp teams",
    clickupWsFailedSpaces: "Failed to load ClickUp spaces",
    clickupWsFailedFolders: "Failed to load ClickUp folders",
    clickupWsFailedLists: "Failed to load ClickUp lists",
    rdStationWsCardTitle: "RD Station CRM",
    rdStationWsCardDescription:
      "Connect RD Station CRM to keep deals in sync both ways: a dedicated project is created with one column per pipeline stage, and changes made in either system update the other automatically.",
    rdStationWsConnectButton: "Connect RD Station",
    rdStationWsConnecting: "Connecting",
    rdStationWsConnected: "Connected",
    rdStationWsAttention: "Attention",
    rdStationWsAuthenticating: "Authenticating...",
    rdStationWsAuthFailed: "RD Station authentication failed",
    rdStationWsConnectFailed: "Failed to connect RD Station",
    rdStationWsSettingUp: "Setting up your CRM project and pipeline columns...",
    rdStationWsConnectedToast: "RD Station connected — your CRM project is ready",
    rdStationWsViewProject: "View CRM project",
    rdStationWsReconnect: "Reconnect",
    rdStationWsReconcile: "Update leads from RD Station",
    rdStationWsReconciling: "Queuing…",
    rdStationWsReconcileQueued: "Lead update queued. Existing cards will be refreshed, not duplicated.",
    rdStationWsReconcileFailed: "Failed to queue the RD Station lead update",
    rdStationWsDisconnect: "Disconnect RD Station",
    rdStationWsDisconnecting: "Disconnecting…",
    rdStationWsDisconnectFailed: "Failed to disconnect RD Station",
    rdStationWsDisconnectedToast: "RD Station disconnected",
    rdStationWsDisconnectTitle: "Disconnect RD Station",
    rdStationWsDisconnectDescription:
      "This stops the sync between JSYNQ and RD Station CRM. The CRM project and its cards stay in JSYNQ, but they'll no longer update RD Station or receive updates from it.",
    rdStationWsAlreadyConnectedError:
      "This workspace already has an active RD Station connection. Disconnect it first.",
    rdStationWsSelectPipelinesTitle: "Select pipelines to import",
    rdStationWsSelectPipelinesDescription:
      "Choose which RD Station pipelines (funis) to bring into JSYNQ. Each one becomes its own dedicated project.",
    rdStationWsNoPipelinesFound: "No pipelines were found in your RD Station account.",
    rdStationWsPipelineStages: "{count} stages",
    rdStationWsImportButton: "Import selected",
    rdStationWsImporting: "Setting up your CRM projects...",
    rdStationWsImportFailed: "Failed to import the selected pipelines",
    rdStationWsSelectAtLeastOne: "Select at least one pipeline",
    rdStationWsCancelSelectionConfirmTitle: "Cancel RD Station connection?",
    rdStationWsCancelSelectionConfirmDescription:
      "You authenticated with RD Station but haven't picked any pipelines yet. Closing this now cancels the connection — you'll need to authenticate again to retry.",
    kommoWsCardTitle: "Kommo CRM",
    kommoWsCardDescription:
      "Import your Kommo pipelines into one CRM project. Each pipeline becomes a board tab, and companies, contacts, and leads stay in sync from Kommo.",
    kommoWsConnectButton: "Connect Kommo",
    kommoWsConnecting: "Connecting…",
    kommoWsConnected: "Connected",
    kommoWsAttention: "Attention",
    kommoWsConnectFailed: "Failed to connect Kommo",
    kommoWsConnectedToast: "Kommo connected — your CRM project is ready",
    kommoWsImportingToast: "Kommo connected — importing pipelines and leads…",
    kommoWsReimportedToast: "Kommo data was reimported",
    kommoWsViewProject: "View CRM project",
    kommoWsReconnect: "Reconnect",
    kommoWsRetryImport: "Retry import",
    kommoWsReimport: "Reimport",
    kommoWsImporting: "Importing from Kommo…",
    kommoWsImportFailed: "Failed to import the Kommo account",
    kommoWsDisconnect: "Disconnect Kommo",
    kommoWsDisconnecting: "Disconnecting…",
    kommoWsDisconnectFailed: "Failed to disconnect Kommo",
    kommoWsDisconnectedToast: "Kommo disconnected",
    kommoWsDisconnectTitle: "Disconnect Kommo",
    kommoWsDisconnectDescription:
      "This stops inbound updates from Kommo. The CRM project, companies, contacts, and cards stay in JSYNQ.",
    kommoWsSubdomainLabel: "Subdomain",
    kommoWsSubdomainPlaceholder: "acme",
    kommoWsSubdomainHint: "The “conta” in conta.kommo.com — you can paste the full URL.",
    kommoWsTokenLabel: "Long-lived access token",
    kommoWsTokenPlaceholder: "Paste the token from your Kommo private integration",
    kommoWsFieldsRequired: "Enter the subdomain and access token.",
    kommoWsPipelineCount: "{count} pipelines",
    kommoWsModalTitle: "Kommo CRM",
    kommoWsModalIntro:
      "Connect your Kommo account with the subdomain and a long-lived token from a private integration.",
    googleWsCardDescription:
      "Connect Gmail and Google Calendar so your agent can read emails, create drafts, and manage calendar events.",
    googleWsConnectButton: "Connect Google",
    googleWsRedirecting: "Redirecting…",
    googleWsConnected: "Connected",
    googleWsAttention: "Attention",
    googleWsToolsCount: "{count} tools",
    googleWsTestConnection: "Test connection",
    googleWsReconnect: "Reconnect",
    googleWsDisconnect: "Disconnect",
    googleWsDisconnectTitle: "Disconnect Google",
    googleWsDisconnectDescription:
      "This will remove the agent's access to Gmail and Google Calendar. You can reconnect at any time.",
    googleWsDisconnecting: "Disconnecting…",
    googleWsSessionExpired: "Session expired. Please sign in again.",
    googleWsDisconnectFailed: "Failed to disconnect one or more Google connections.",
    googleWsDisconnectedToast: "Google disconnected successfully.",
    googleWsDisconnectUnexpectedError: "Unexpected error while disconnecting Google.",
    googleWsTestHealthy: "Connection healthy!",
    googleWsTestFailed: "Connection test failed.",
    googleWsTestUnexpectedError: "Unexpected error while testing the connection.",
    googleWsStatusHealthy: "Connected",
    googleWsStatusDegraded: "Degraded",
    googleWsStatusUnhealthy: "Error",
    googleWsStatusUnknown: "Unknown",
    googleWsOAuthSuccessToast: "Google connected! Gmail and Calendar are available.",
    googleWsOAuthUnknownError: "Unknown error",
    googleWsOAuthAccessDenied: "You canceled authorization. Click again to connect.",
    googleWsOAuthNotConfigured: "Google integration is not configured. Contact an administrator.",
    googleWsOAuthFailed: "Failed to connect Google: {error}",
    integrationBtnConnect: "Connect",
    integrationBtnConnected: "Connected",
    integrationModalPickFirst: "Select an integration to configure.",
    integrationModalHint:
      "Telegram assistant for this workspace · Each teammate links their own account with a one-time code.",
    integrationTabOverview: "Summary",
    integrationTabSetup: "Connection",
    integrationTabLinkUsers: "Link accounts",
    integrationTabHelp: "Help",
    integrationOverviewIntro:
      "Use Connection to add or change the bot. Use Link accounts so people can connect their Telegram to this workspace.",
    integrationOverviewBotLanguage: "Bot language",
    integrationOverviewNotSet: "Not set yet",
    integrationOverviewLastUpdated: "Last updated",
    integrationOverviewCreated: "Created",
    integrationOverviewWebhookTitle: "Webhook address",
    integrationOverviewCopyWebhook: "Copy webhook URL",
    integrationOverviewWebhookHelp:
      "Needed if you verify the integration with your IT team. Day-to-day setup is on the Connection tab.",
    integrationOverviewSecretsNote:
      "Saved bot and API tokens are not shown anywhere in the app—use Connection and enter them again when you change setup.",
    integrationSetupIntro:
      "Connect your Telegram bot and choose how the assistant talks to your workspace data. Saved secrets are never shown again—paste fresh values whenever you update this integration.",
    integrationSetupBotFatherTitle: "Where do I get a bot token?",
    integrationSetupBotFatherStep1: "Open Telegram and chat with @BotFather.",
    integrationSetupBotFatherStep2: "Send the command /newbot and follow the steps.",
    integrationSetupBotFatherStep3: "Copy the token (looks like 123456:AA…) into the field below.",
    integrationSetupBotTokenLabel: "Bot token from BotFather",
    integrationSetupBotTokenPlaceholder: "Paste token here",
    integrationSetupLanguageLabel: "Assistant language (optional)",
    integrationSetupLanguagePlaceholder: "e.g. en, pt-BR",
    integrationSetupAutoTokenTitle: "Create an API token for this bot for me",
    integrationSetupAutoTokenDesc:
      "Pick permissions below, then confirm. We create the token in the background and send it when you save. Turn off to paste an existing token instead.",
    integrationSetupScopesAccordion: "What the assistant can access",
    integrationSetupConfirmToken: "Confirm permissions & create access",
    integrationSetupConfirmTokenWorking: "Creating access…",
    integrationSetupManualTokenLabel: "Your API token",
    integrationSetupManualHelp: "Create one under Settings → Members on your profile, then paste it here.",
    integrationSetupWebhookAdvanced: "Webhook URL (advanced)",
    integrationSetupCopy: "Copy",
    integrationSetupSaving: "Saving…",
    integrationSetupSave: "Save connection",
    integrationSetupNoPermission: "You need permission to manage workspace integrations.",
    integrationLinkSavedTitle: "Connection saved",
    integrationLinkSavedBody:
      "Generate a code below and send it to your bot so people can link their Telegram account.",
    integrationLinkTitle: "Link a Telegram account",
    integrationLinkBody: "We'll give you a short code. In Telegram, open your workspace bot and send:",
    integrationLinkGetCode: "Get a new code",
    integrationLinkCreatingCode: "Creating code…",
    integrationLinkYourCode: "Your code",
    integrationLinkCopy: "Copy",
    integrationLinkExpired: "Expired — generate a new one",
    integrationLinkValidFor: "Valid for",
    integrationTroubleshootIntro: "If something isn't working, check these first:",
    integrationTroubleshoot1Title: "Telegram doesn't reach your server",
    integrationTroubleshoot1Body:
      "Your app must be on a public HTTPS URL. Confirm the webhook URL on the Summary tab matches what your backend expects.",
    integrationTroubleshoot2Title: "Bot says you're not linked",
    integrationTroubleshoot2Body:
      "Generate a fresh code on Link accounts, send it from the same Telegram account, and use it before it expires.",
    integrationTroubleshoot3Title: "Replies are empty or very limited",
    integrationTroubleshoot3Body:
      "On Connection, make sure the bot has enough permissions selected (or a token that can read projects and tasks). The user must have access in the workspace.",
    integrationCreateModalTitle: "Add Telegram integration",
    integrationCreateNameLabel: "Name",
    integrationCreateNamePlaceholder: "Workspace Telegram Assistant",
    integrationCreateDescLabel: "Description (optional)",
    integrationCreateDescPlaceholder: "Read-only assistant for workspace users",
    integrationCreateButton: "Create integration",
    integrationCreateCreating: "Creating...",
    integrationCountdownExpired: "Expired",
    integrationToastNameRequired: "Name is required",
    integrationToastCreated: "Telegram integration created",
    integrationToastContinueSetup: "Integration created. Continue with Telegram setup.",
    integrationToastBotTokenRequired: "Bot token is required",
    integrationToastNeedGeneratedToken:
      "Confirm permissions first to create an API token (or paste one if you turned off automatic creation).",
    integrationToastPasteToken: "Paste your API token before saving.",
    integrationToastScopesAndToken: "Choose at least one permission, then confirm to create the API token.",
    integrationToastSetupSaved: "Telegram setup saved",
    integrationToastLinkCodeOk: "Link code generated",
    integrationToastCodeCopied: "Code copied",
    integrationToastWebhookCopied: "Webhook URL copied",
    integrationToastPermissionsChanged: "Permissions changed — confirm again to create a new API token.",
    integrationToastSignInForToken: "Sign in to create an API token.",
    integrationToastPickScopes: "Choose at least one permission first.",
    integrationToastTokenFail: "Could not create API token",
    integrationToastTokenCreatedAgain:
      "Access created — click Save connection when ready. Your other tokens stay active.",
    integrationToastTokenCreated: "Access created — click Save connection when the rest of the form is ready.",
    integrationDefaultName: "Workspace Telegram Assistant",
    integrationDefaultDescription: "Read-only assistant for workspace users",
    errorUserNotAuthenticated: "User not authenticated",
    errorLabelLength: "Label must be 80 characters or fewer",
    errorCouldNotLoadTokens: "Could not load API tokens",
    errorCouldNotRevokeToken: "Could not revoke token",
    errorFailedToCreateToken: "Failed to create token",
    errorTokenNotAvailable: "Copy is only available right after you create a token",
    errorFailedToCopy: "Failed to copy token",
    integrationDelete: "Delete",
    integrationDeleting: "Deleting...",
    integrationDeleteConfirm: "Are you sure you want to delete this integration? This action cannot be undone.",
    integrationDeleteSuccess: "Integration deleted successfully",
    integrationDeleteError: "Failed to delete integration",
    integrationEnable: "Enable",
    integrationDisable: "Disable",
    integrationEnabling: "Enabling...",
    integrationDisabling: "Disabling...",
    integrationStatusUpdated: "Integration status updated",
    integrationStatusUpdateError: "Failed to update integration status",
    integrationDisconnect: "Disconnect",
    integrationWebhookUrl: "Webhook URL",
    // API Token Scopes
    apiTokenScopesTitle: "Token scopes",
    apiTokenPermissionsSelected: (count: number) =>
      `${count} permission${count === 1 ? "" : "s"} selected · expand each area below`,
    apiTokenScopesSelected: (count: number) => `${count} selected · expand each category`,
    apiTokenPresetAssistant: "Assistant minimum",
    apiTokenPresetReadAll: "All read scopes",
    apiTokenPresetClear: "Clear",
    apiTokenPresetSelectAll: "Select all scopes (full access in this list)",
    apiTokenScopesHelperEmbedded:
      "Only checked items are allowed for this bot. Adjust to match how much you want the assistant to see.",
    apiTokenScopesHelperDefault: "Only checked permissions are included. Unknown scope ids are rejected by the server.",
    // Scope group categories
    scopeCategoryWorkspaces: "Workspaces",
    scopeCategoryProjects: "Projects",
    scopeCategoryCards: "Cards",
    scopeCategoryDocuments: "Documents",
    scopeCategoryMeetings: "Meetings & transcripts",
    scopeCategoryDashboard: "Dashboard & time",
    // Scope labels
    scopeWorkspacesRead: "Workspaces (read)",
    scopeWorkspacesWrite: "Workspaces (write)",
    scopeProjectsRead: "Projects (read)",
    scopeProjectsWrite: "Projects (write)",
    scopeCardsRead: "Cards (read)",
    scopeCardsWrite: "Cards (write)",
    scopeDocumentsRead: "Documents (read)",
    scopeDocumentsWrite: "Documents (write)",
    scopeMeetingsRead: "Meetings (read)",
    scopeTranscriptsRead: "Transcripts (read)",
    scopeDashboardRead: "Dashboard (read)",
    scopeTimeTrackerRead: "Time tracker (read)",
    scopeTimeTrackerWrite: "Time tracker (write)",
    // Scope descriptions
    scopeDescWorkspacesRead: "Read workspace-level data",
    scopeDescWorkspacesWrite: "Create or update workspace resources",
    scopeDescProjectsRead: "List projects and read metadata",
    scopeDescProjectsWrite: "Create or update projects",
    scopeDescCardsRead: "Read cards and task data",
    scopeDescCardsWrite: "Create or update cards",
    scopeDescDocumentsRead: "Read documents",
    scopeDescDocumentsWrite: "Create or update documents",
    scopeDescMeetingsRead: "Read meeting data",
    scopeDescTranscriptsRead: "Read transcripts",
    scopeDescDashboardRead: "Read dashboard data",
    scopeDescTimeTrackerRead: "Read time entries",
    scopeDescTimeTrackerWrite: "Create or update time entries",
    integrationSetupPostSaveMessage: "All set — your bot is linked with the API token you saved.",
    integrationLinkInstructionsFallback: "Send the code to your bot in Telegram using /link.",
    integrationLinkKbdExample: "/link YOUR_CODE",
    integrationApiTokenLabel: "Telegram assistant",
    // Wizard steps
    integrationWizardStep1Label: "Bot Configuration",
    integrationWizardStep2Label: "API Token",
    integrationWizardStep3Label: "Review & Connect",
    integrationWizardContinue: "Continue",
    integrationWizardBack: "Back",
    integrationWizardReviewTitle: "Review your configuration before connecting:",
    integrationWizardBotConfigLabel: "Bot Token",
    integrationWizardLanguageConfigLabel: "Language",
    integrationWizardTokenMethodLabel: "Token Method",
    integrationWizardTokenMethodAuto: "Auto-generated",
    integrationWizardTokenMethodManual: "Manual entry",
    integrationWizardScopesLabel: "Scopes",
    integrationWizardScopesCount: "{count} permissions selected",
    integrationWizardTokenConfigured: "Bot token is already configured",
    integrationWizardTokenReplace: "Replace token",
    integrationWizardScopeRequired: "Please select at least one scope",
    integrationWizardApiTokenRequired: "API token is required",
    integrationWizardBotTokenRequired: "Bot token is required",

    // MCP Connections
    addConnection: "Add Connection",
    testConnection: "Test Connection",
    connectionHealthy: "Healthy",
    connectionDegraded: "Degraded",
    connectionUnhealthy: "Unhealthy",
    connectionUnknown: "Unknown",

    // Agents
    agents: "Agents",
    createAgent: "Create Agent",
    agentTypeSpecialized: "Specialized",
    agentTypeOrchestrator: "Orchestrator",
    systemPrompt: "System Prompt",
    availableTools: "Available Tools",
    modelConfig: "Model Configuration",
    temperature: "Temperature",
    maxSteps: "Max Steps",

    // Workflows
    workflows: "Workflows",
    createWorkflow: "Create Workflow",
    stepName: "Step Name",
    variableMapping: "Variable Mapping",

    // Chat
    selectAgent: "Select Agent",
    sendMessage: "Send Message",
    confirmationRequired: "Confirmation Required",
    approve: "Approve",
    reject: "Reject",
    automationsHubNav: "Automations",
  },

  portuguese: {
    // Form fields
    workspaceName: "Nome do workspace",
    companyName: "Nome da empresa",
    companyWebsite: "Site da empresa",
    domain: "Domínio",
    workspaceNamespace: "Namespace do workspace",
    workspaceNamespaceHint: "Único em todo o JSYNQ. A URL do workspace será {url}.",
    workspaceNamespacePlaceholder: "seu-workspace",
    workspaceNamespaceInvalid: "Use letras minúsculas, números e hífens. Não use --.",
    workspaceNamespaceReserved: "Esse namespace é reservado.",
    workspaceNamespaceTaken: "Esse namespace já está em uso.",
    workspaceOwner: "Proprietário do workspace",
    description: "Descrição",

    // Buttons
    cancel: "Cancelar",
    save: "Salvar",
    copy: "Copiar",

    // WhatsApp Lite (workspace)
    whatsappLiteNav: "WhatsApp",
    messagesSettingsNav: "Mensagens",
    smsLiteNav: "SMS",
    voiceCallsSettingsNav: "Chamadas de voz",
    smsLiteTitle: "Números SMS",
    smsLiteSubtitle: "Ligue números SMS, configure agentes IA, automação de CRM e automações inbound.",
    smsLiteSessions: "Números SMS",
    smsLiteTabSessionsDesc: "Ligue e gira os números SMS (Twilio) deste workspace.",
    smsLiteAutomation: "Agentes",
    smsLiteTabAutomationDesc: "Agente IA por número, criação automática de negociações e follow-ups.",
    smsLiteRuleTemplates: "Automações",
    smsLiteTabFlowsDesc:
      "Regras visuais com gatilhos e ações quando chegam mensagens SMS (mover ou copiar negociações, atribuir contatos, etc.).",
    smsLiteBindingsTitle: "Agente IA por número",
    smsLiteBindingsDesc:
      "Associe um agente a cada número para respostas automáticas, criação de negociações e follow-ups.",
    smsLiteBindingsEmpty:
      "Ainda não há agente configurado. Adicione um para activar respostas com IA e automação de CRM num número SMS.",
    smsLiteCreateBinding: "Adicionar agente",
    smsLiteEditBinding: "Editar agente por número",
    smsLiteSession: "Número SMS",
    smsLiteRuleTemplatesHint:
      "Monte regras visuais: quando chega uma mensagem, executa ações como mover ou copiar uma negociação, atribuir o contato ou alterar o estado da conversa. Ganha a primeira automação que fizer match.",
    smsLiteRuleTemplatesEmpty: "Ainda não há automações. Crie uma para executar acções quando chegam mensagens.",
    smsLiteRuleTemplatesAdd: "Nova automação",
    smsLiteRuleTemplatesNoSessionsLinked: "Nenhum número seleccionado — esta automação não corre até a editar.",
    smsLiteRuleTemplatesPriority: "Prioridade",
    smsLiteSessionStatusActive: "Ativo",
    smsLiteSessionStatusDisabled: "Desativado",
    smsLiteSessionStatusPendingConfig: "Configuração pendente",
    smsLiteAddSession: "Adicionar número",
    smsLiteEmptySessions: "Ainda não há números SMS configurados",
    smsLiteEmptySessionsHint: 'Clique em "Adicionar número" para começar.',
    smsLiteActionsAriaLabel: "Acções",
    smsLiteSessionEnable: "Activar",
    smsLiteSessionDisable: "Desactivar",
    smsLiteSessionProvider: "Fornecedor",
    smsLiteSessionCreatedAt: "Criado em",
    smsLiteEditSessionTitle: "Editar número SMS",
    smsLiteCreateSessionTitle: "Adicionar número SMS",
    smsLiteSessionLabel: "Nome exibido",
    smsLiteSessionLabelPlaceholder: "Ex.: Atendimento comercial",
    smsLiteSessionFromNumber: "Número de origem (Twilio)",
    smsLiteSessionFromNumberPlaceholder: "+15551234567",
    smsLiteSessionAccountSid: "Account SID",
    smsLiteSessionAccountSidPlaceholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    smsLiteSessionAccountSidKeepPlaceholder: "Deixe vazio para manter o actual",
    smsLiteSessionAuthToken: "Auth Token",
    smsLiteSessionAuthTokenPlaceholder: "Token de autenticação Twilio",
    smsLiteSessionAuthTokenKeepPlaceholder: "Deixe vazio para manter o actual",
    smsLiteSessionNameRequired: "Indique o nome do número.",
    smsLiteSessionFromNumberRequired: "Indique o número de origem.",
    smsLiteSessionCredentialsRequired: "Indique Account SID e Auth Token.",
    smsLiteSessionUpdated: "Número SMS actualizado.",
    smsLiteSessionCreated: "Número SMS criado.",
    smsLiteSessionEnabledToast: "Número SMS activado.",
    smsLiteSessionDisabledToast: "Número SMS desactivado.",
    smsLiteSessionDeleted: "Número SMS eliminado.",
    smsLiteDeleteSessionTitle: "Excluir número SMS",
    smsLiteDeleteSessionConfirm: 'Tem a certeza que deseja excluir "{label}"? Esta acção não pode ser desfeita.',
    smsLiteBindingSessionSearch: "Procurar números…",
    smsLiteBindingSessionEmptyNoSessions: "Nenhum número disponível. Adicione um na tab Números SMS.",
    smsLiteSearchNoResults: "Nenhum resultado encontrado.",
    smsLiteBindingAgentSearch: "Procurar agentes…",
    smsLiteBindingAgentEmptyNoAgents: "Nenhum agente neste workspace.",
    smsLiteSelectSession: "Seleccione um número…",
    smsLiteSelectAgent: "Seleccione um agente…",
    smsLiteSelectProject: "Seleccione um projecto…",
    smsLiteSelectColumn: "Seleccione uma coluna…",
    smsLiteBindingCreated: "Configuração de agente criada.",
    smsLiteBindingUpdated: "Configuração de agente actualizada.",
    smsLiteBindingPaused: "Configuração de agente em pausa.",
    smsLiteBindingResumed: "Configuração de agente retomada.",
    smsLiteBindingDeleted: "Configuração de agente eliminada.",
    smsLiteDeleteBindingTitle: "Excluir configuração de agente",
    smsLiteDeleteBindingConfirm:
      "Tem a certeza que deseja excluir esta configuração? Esta acção não pode ser desfeita.",
    smsLiteBindingLeadProjectColumnRequired: "Selecione o projeto e a coluna da negociação.",
    smsLiteFlowNameRequired: "Indique o nome do fluxo.",
    smsLiteFlowUpdated: "Fluxo actualizado.",
    smsLiteFlowCreated: "Fluxo criado.",
    smsLiteFlowDeleted: "Fluxo eliminado.",
    smsLiteDeleteFlowTitle: "Excluir fluxo SMS",
    smsLiteDeleteFlowConfirm: 'Tem a certeza que deseja excluir "{name}"? Esta acção não pode ser desfeita.',
    smsLiteIntegrationCardDesc:
      "Envie e receba SMS via Twilio. Gerencie conversas, automatize respostas e acompanhe leads pelo SMS.",
    smsLiteIntegrationActivate: "Ativar",
    smsLiteIntegrationActiveSessions: "{count} sessão(ões) ativa(s)",
    smsLiteIntegrationConfigure: "Configurar",
    smsLiteIntegrationNewSession: "Novo número",
    smsLiteIntegrationWizardTitle: "Configurar SMS — Twilio",
    smsLiteIntegrationWizardDesc: "Preencha as credenciais Twilio para ativar o envio e recebimento de SMS.",
    smsLiteIntegrationCreating: "A criar…",
    smsLiteIntegrationWebhookTitle: "Webhook URL",
    smsLiteIntegrationWebhookDesc: "Configure este URL como webhook no painel Twilio para receber SMS.",
    smsLiteIntegrationWebhookUrlLabel: "Webhook URL",
    smsLiteIntegrationCopyUrl: "Copiar URL",
    smsLiteIntegrationWebhookCopied: "URL do webhook copiado!",
    smsLiteIntegrationContinue: "Continuar",
    smsLiteIntegrationSessionCreatedTitle: "Número criado!",
    smsLiteIntegrationSessionCreatedDesc:
      'O número "{label}" foi criado com sucesso. Pode gerir os números SMS nas configurações.',
    smsLiteIntegrationGoToSettings: "Ir para configurações",
    smsLiteIntegrationClose: "Fechar",
    instagramLiteNav: "Instagram",
    instagramLiteTitle: "Contas Instagram",
    instagramLiteSubtitle:
      "Gerencie as contas de Instagram DM. Adicione contas, atribua agentes e configure automações inbound.",
    instagramLiteIntegrationCardDesc:
      "Envie e receba DMs do Instagram via Unipile. Gerencie conversas, automatize respostas e sincronize leads.",
    instagramLiteIntegrationActivate: "Adicionar conta",
    instagramLiteIntegrationActiveSessions: "{count} conta(s) ativa(s)",
    instagramLiteIntegrationConfigure: "Configurar",
    instagramLiteIntegrationNewAccount: "Nova conta",
    instagramLiteIntegrationAddAccount: "Adicionar conta Instagram",
    instagramLiteFreeAccountHint: "Grátis — sua primeira conta do Instagram está incluída no seu plano.",
    instagramLiteIntegrationAdding: "Redirecionando…",
    instagramLiteIntegrationLabelPlaceholder: "ex. Instagram da Empresa",
    instagramLiteIntegrationLabelRequired: "Digite um nome para esta conta.",
    instagramLiteBillingActive: "Ativa",
    instagramLiteBillingPastDue: "Pagamento atrasado",
    instagramLiteBillingFree: "Grátis",
    instagramLiteBillingCanceled: "Cancelada",
    instagramLiteBillingPending: "Pendente",
    instagramLitePaymentStillProcessing:
      "O pagamento ainda está a ser processado. Aguarde um momento e tente novamente.",
    instagramLiteConnectBillingBlocked:
      "Não foi possível ligar esta conta do Instagram agora. Tente novamente dentro de momentos.",
    instagramLiteStatusConnected: "Conectado",
    instagramLiteStatusPendingConnect: "Conexão pendente",
    instagramLiteStatusReconnectRequired: "Reconexão necessária",
    instagramLiteStatusDisabled: "Desativado",
    instagramLiteSessions: "Contas",
    instagramLiteSessionsDesc: "Contas do Instagram conectadas a este workspace.",
    instagramLiteAutomation: "Agentes",
    instagramLiteAutomationDesc: "Atribua um agente IA por conta Instagram para respostas automáticas e CRM.",
    instagramLiteTemplates: "Automações",
    instagramLiteTemplatesDesc: "Regras visuais inbound acionadas por DMs do Instagram.",
    instagramLiteNoSessions: "Nenhuma conta Instagram adicionada ainda.",
    instagramLiteUsernamePending: "Username ainda não sincronizado — reconecte se persistir.",
    instagramLiteSessionAccessTitle: "Acesso à conta Instagram",
    instagramLiteSessionAccessDesc: "Controle quem pode ver as conversas de",
    smsLiteSessionAccessTitle: "Acesso ao número de SMS",
    smsLiteSessionAccessDesc: "Controle quem pode ver as conversas de",
    instagramLiteNoTemplates: "Nenhuma automação Instagram criada ainda.",
    instagramLiteConnect: "Conectar",
    instagramLiteReconnect: "Reconectar",
    instagramLiteSession: "Conta Instagram",
    instagramLiteBindingsEmpty:
      "Ainda não há agente configurado. Adicione um para activar respostas com IA e automação de CRM numa conta Instagram.",
    instagramLiteCreateBinding: "Adicionar agente",
    messagingBindingNoAgentAssigned: "Nenhum agente atribuído",
    messagingBindingScopeConversation: "Somente uma conversa",
    messagingBindingScopeConversationHint:
      "Este agente só responde em uma conversa. Para responder todas as novas conversas deste número, adicione um agente para o número inteiro.",
    messagingBindingAutoUpdate: "Auto-update",
    messagingBindingEditAria: "Editar vínculo do agente",
    messagingBindingPauseAria: "Pausar vínculo do agente",
    messagingBindingResumeAria: "Retomar vínculo do agente",
    messagingBindingDeleteAria: "Excluir vínculo do agente",
    whatsappLiteTitle: "Números WhatsApp",
    whatsappLiteSubtitle:
      "Ligue números WhatsApp ao workspace. Cada número pode alimentar a caixa de entrada e as regras de automação.",
    whatsappLiteSessions: "Números WhatsApp",
    whatsappLiteAddSession: "Adicionar número",
    whatsappLitePaidPlanRequired:
      "Linhas de WhatsApp estão disponíveis em planos pagos. Faça upgrade para adicionar um número.",
    whatsappLiteTransport: "Tipo de conexão",
    whatsappLiteTransportBaileys: "WhatsApp Web (QR code)",
    whatsappLiteTransportCloud: "Cloud API (Meta oficial)",
    whatsappLiteTransportBaileysHint: "Conecte lendo um QR code, como no WhatsApp Web.",
    whatsappLiteTransportCloudHint:
      "API oficial da Meta — preencha as credenciais abaixo. O JSYNQ valida, registra o número na Meta e conecta os webhooks automaticamente.",
    whatsappLiteCloudAddDesc:
      "Use o mesmo WABA ID, Phone Number ID e token de System User do Meta Business Manager. Deixe o PIN em branco, a menos que este número já tenha verificação em duas etapas.",
    whatsappLiteEmbeddedSignupDesc:
      "Entre com a Meta para escolher a conta WhatsApp Business e o número. O JSYNQ registra. Se o número já tiver PIN de verificação em duas etapas, você informa depois que a Meta aceitar o login.",
    whatsappLiteEmbeddedSignupContinue: "Continuar com a Meta",
    whatsappLiteEmbeddedSignupShowManual: "Inserir credenciais WABA manualmente",
    whatsappLiteEmbeddedSignupHideManual: "Ocultar credenciais manuais",
    whatsappLiteEmbeddedSignupMissingIds:
      "A Meta não devolveu o ID da conta WhatsApp Business ou do número. Conclua o Embedded Signup e tente de novo.",
    whatsappLiteEmbeddedSignupFailed: "Não foi possível concluir o Embedded Signup da Meta.",
    whatsappLiteEmbeddedSignupPinTitle: "PIN de verificação em duas etapas",
    whatsappLiteEmbeddedSignupPinDesc:
      "Este número já tem PIN de verificação em duas etapas. Digite o PIN de 6 dígitos do WhatsApp Manager.",
    whatsappLiteEmbeddedSignupPinSubmit: "Registrar número",
    whatsappLiteCloudSetupIntro:
      "Antes de salvar, confirme que o número está adicionado e verificado no WhatsApp Manager. O JSYNQ registra na Meta por você — sem curl manual.",
    whatsappLiteCloudSetupStep1: "Adicione e verifique o número no WhatsApp Manager (SMS ou voz).",
    whatsappLiteCloudSetupStep2:
      "Copie WABA ID e Phone Number ID no Business Manager / Developers — não use o +55 exibido ao cliente.",
    whatsappLiteCloudSetupStep3:
      "Cole o token de System User e o PIN de verificação em duas etapas (existente ou novo).",
    whatsappLiteCloudSectionIds: "Identificadores Meta",
    whatsappLiteCloudSectionSecrets: "Token e registro",
    whatsappLiteCloudWabaId: "ID da conta WhatsApp Business",
    whatsappLiteCloudWabaIdHint: "WhatsApp Manager → Visão geral da conta, ou Configurações → Contas WhatsApp.",
    whatsappLiteCloudPhoneNumberId: "ID do número de telefone",
    whatsappLiteCloudPhoneNumberIdHint:
      "Meta for Developers → WhatsApp → API Setup. É um ID numérico, não o telefone que o cliente vê.",
    whatsappLiteCloudAccessToken: "Token de acesso",
    whatsappLiteCloudAccessTokenHint:
      "Token permanente de System User com whatsapp_business_messaging e whatsapp_business_management. Guardado criptografado — nunca exibido de novo.",
    whatsappLiteCloudPin: "PIN de verificação em duas etapas",
    whatsappLiteCloudPinHint:
      "Deixe em branco se o número não tem verificação em duas etapas. O JSYNQ define um PIN. Se a Meta já tiver um, digite esses 6 dígitos.",
    whatsappLiteCloudPinProgress: "{count}/6 dígitos",
    whatsappLiteCloudShowPin: "Mostrar PIN",
    whatsappLiteCloudHidePin: "Ocultar PIN",
    whatsappLiteCloudMetaLink: "Abrir WhatsApp Manager → Números de telefone",
    whatsappLiteCloudConnectSaving: "Conectando e registrando…",
    whatsappLiteCloudUpdateCredentials: "Atualizar credenciais Cloud API",
    whatsappLiteCloudUpdateTitle: "Atualizar credenciais Cloud API",
    whatsappLiteCloudUpdateDesc:
      "Informe novamente o token e o PIN. O JSYNQ revalida na Meta e registra o número de novo, se necessário.",
    whatsappLiteCloudUpdateSaving: "Atualizando credenciais…",
    whatsappLiteCloudRegistered: "Número Cloud API conectado e registrado na Meta",
    whatsappLiteCloudAlreadyRegistered: "Número Cloud API conectado (já estava registrado na Meta)",
    whatsappLiteCloudUpdated: "Credenciais Cloud API atualizadas",
    whatsappLiteCloudConnected: "Número Cloud API conectado",
    whatsappLiteCloudTemplatesTab: "Templates",
    whatsappLiteCloudTemplatesTitle: "Templates de mensagem",
    whatsappLiteCloudTemplatesDesc:
      "Templates aprovados pela Meta usados para iniciar conversas fora da janela de 24 horas.",
    whatsappLiteCloudTemplatesEmpty: "Nenhum template ainda. Sincronize com a Meta ou crie um novo.",
    whatsappLiteCloudTemplatesSync: "Sincronizar com a Meta",
    whatsappLiteCloudTemplatesSynced: "{count} templates sincronizados",
    whatsappLiteCloudTemplatesCreate: "Novo template",
    whatsappLiteCloudTemplateName: "Nome",
    whatsappLiteCloudTemplateNameHint: "Minúsculas, sem espaços. Espaços viram underscores automaticamente.",
    whatsappLiteCloudTemplateLanguage: "Idioma",
    whatsappLiteCloudTemplateCategory: "Categoria",
    whatsappLiteCloudTemplateHeader: "Cabeçalho (opcional)",
    whatsappLiteCloudTemplateHeaderType_NONE: "Nenhum",
    whatsappLiteCloudTemplateHeaderType_TEXT: "Texto",
    whatsappLiteCloudTemplateHeaderType_IMAGE: "Imagem",
    whatsappLiteCloudTemplateHeaderType_VIDEO: "Vídeo",
    whatsappLiteCloudTemplateHeaderType_DOCUMENT: "Documento",
    whatsappLiteCloudTemplateHeaderTextPlaceholder: "Texto do cabeçalho",
    whatsappLiteCloudTemplateHeaderUpload: "Enviar arquivo de exemplo",
    whatsappLiteCloudTemplateHeaderUploadHint:
      "A Meta exige um exemplo para aprovar um cabeçalho de mídia. A mídia real é escolhida no envio.",
    whatsappLiteCloudTemplateBodyExamples: "Exemplos de variáveis",
    whatsappLiteCloudTemplateBodyExamplesHint:
      "Valores de exemplo para cada variável, exigidos pela Meta na aprovação.",
    whatsappLiteCloudTemplateBodyExamplePlaceholder: "Valor de exemplo",
    whatsappLiteCloudTemplateButtons: "Botões (opcional)",
    whatsappLiteCloudTemplateButtonQuickReply: "Resposta rápida",
    whatsappLiteCloudTemplateButtonUrl: "Link",
    whatsappLiteCloudTemplateButtonText: "Texto do botão",
    whatsappLiteCloudTemplateAddButton: "Adicionar botão",
    whatsappLiteCloudTemplateRemoveButton: "Remover botão",
    whatsappLiteCloudTemplateBody: "Corpo",
    whatsappLiteCloudTemplateBodyHint:
      "Use {{1}}, {{2}} para variáveis preenchidas no envio. Quebras de linha são permitidas no texto fixo (máx. 2 seguidas). Valores das variáveis não podem conter quebras de linha.",
    whatsappLiteCloudTemplateFooter: "Rodapé (opcional)",
    whatsappLiteCloudTemplateCreated: "Template enviado à Meta para revisão",
    whatsappLiteCloudTemplateDeleted: "Template excluído",
    whatsappLiteCloudTemplateDeleteTitle: "Excluir template",
    whatsappLiteCloudTemplateDeleteConfirm: 'Excluir o template "{name}"? Isso também o remove da Meta.',
    whatsappLiteCloudTemplateVarBindingsTitle: "Mapeamento de variáveis CRM (opcional)",
    whatsappLiteCloudTemplateVarBindingsDesc:
      "Opcional. Preenche automaticamente na caixa de entrada a partir do CRM quando a conversa está ligada a um card. Sem mapeamento, você preenche manualmente no envio.",
    whatsappLiteTemplateSettingsTitle: "Configurações do Template",
    whatsappLiteTemplateSettingsSubtitle: "Configure os parâmetros e variáveis para o template selecionado.",
    whatsappLiteTemplateIdentification: "Identificação",
    whatsappLiteTemplateLanguageSection: "Idioma",
    whatsappLiteTemplateVarColumn: "Variável",
    whatsappLiteTemplateCrmFieldColumn: "Campo do CRM",
    whatsappLiteTemplateVarsFound: "{count} Variáveis Encontradas",
    whatsappLiteTemplatePrimaryLanguage: "Idioma Principal",
    whatsappLiteTemplateSaveChanges: "Salvar Alterações",
    whatsappLiteTemplateUnsavedTitle: "Descartar alterações?",
    whatsappLiteTemplateUnsavedDesc: "Existem alterações não salvas. Deseja fechar sem salvar?",
    whatsappLiteKeepEditing: "Continuar editando",
    whatsappLitePreviewMessagePlaceholder: "Mensagem",
    whatsappLiteCloudNoSessions: "Conecte um número Cloud API primeiro para gerenciar templates.",
    whatsappLiteCloudSelectSession: "Número",
    whatsappLiteWorkspaceTemplatesTab: "Atalhos",
    whatsappLiteWorkspaceTemplatesTabDesc:
      "Mensagens reutilizáveis para autocomplete na caixa de entrada e campanhas Baileys. Em números Cloud API funcionam dentro da janela de 24 horas.",
    messagingShortcutsNav: "Atalhos",
    messagingShortcutsSubtitle:
      "Crie mensagens reutilizáveis para WhatsApp e SMS. A equipa pode inseri-las pelo botão flash no compositor ou digitando :atalho.",
    messagingShortcutsSearchPlaceholder: "Buscar título ou mensagem…",
    messagingShortcutsSessionFilterLabel: "Linha WhatsApp",
    messagingShortcutsSessionFilterAll: "Todas as linhas",
    messagingShortcutsLoadingMore: "A carregar mais…",
    whatsappLiteWorkspaceTemplatesTitle: "Mensagens prontas",
    whatsappLiteWorkspaceTemplatesDesc:
      "Mensagens salvas com variáveis {{1}}, {{2}}… Enviadas como texto normal — sem aprovação da Meta. Em números oficiais Cloud API, apenas dentro da janela de 24 horas.",
    whatsappLiteWorkspaceTemplatesEmpty: "Nenhuma mensagem pronta ainda.",
    whatsappLiteWorkspaceTemplatesCreate: "Nova mensagem",
    whatsappLiteWorkspaceTemplateName: "Nome",
    whatsappLiteWorkspaceTemplateNameHint: "Exibido nos seletores e no autocomplete.",
    whatsappLiteWorkspaceTemplateShortcut: "Atalho",
    whatsappLiteWorkspaceTemplateShortcutHint:
      "Opcional. Digite :atalho no compositor para autocompletar esta mensagem.",
    whatsappLiteWorkspaceTemplateBody: "Mensagem",
    whatsappLiteWorkspaceTemplateBodyHint: "Use {{1}}, {{2}}… para variáveis.",
    whatsappLiteWorkspaceTemplatePreview: "Pré-visualização",
    whatsappLiteWorkspaceTemplateEdit: "Editar mensagem",
    whatsappLiteWorkspaceTemplateCreated: "Mensagem criada",
    whatsappLiteWorkspaceTemplateUpdated: "Mensagem atualizada",
    whatsappLiteWorkspaceTemplateDeleted: "Mensagem excluída",
    whatsappLiteWorkspaceTemplateDeleteTitle: "Excluir mensagem?",
    whatsappLiteWorkspaceTemplateDeleteConfirm: 'Excluir a mensagem "{name}"? Isso não pode ser desfeito.',
    whatsappLiteWorkspaceTemplateAttachments: "Anexos",
    whatsappLiteWorkspaceTemplateAttachmentBadge: "{count} ficheiros",
    whatsappLiteLabel: "Nome exibido",
    whatsappLiteRename: "Renomear",
    whatsappLiteReconnectSession: "Religar (emparelhamento guardado)",
    whatsappLiteReconnectStarted: "Religação iniciada. O estado deve actualizar em poucos segundos.",
    whatsappLiteSessionAccessTitle: "Acesso ao número de WhatsApp",
    whatsappLiteSessionAccessDesc: "Defina quem pode acessar as conversas de",
    messagingAclAccessDescTail: "e quais ações pode executar.",
    messagingAclScopeUserAssigned: "Só as atribuídas",
    messagingAclScopeAll: "Todas as conversas",
    messagingAclScopeRoleAssigned: "Só as próprias",
    messagingAclScopeRoleGroup: "Conversas do grupo",
    messagingAclScopeRoleAll: "Todas as conversas",
    whatsappLiteSessionSharingWith: "A partilhar com",
    whatsappLiteSessionNoAccessYet: "Ainda não há pessoas adicionadas.",
    whatsappLiteSessionAddRole: "Adicionar cargo",
    whatsappLiteSessionNoRolesToAdd: "Nenhum cargo para adicionar",
    whatsappLiteSessionCanEdit: "Pode editar",
    whatsappLiteSessionCanView: "Pode ver",
    whatsappLiteSessionNeedUserOrRole: "Adicione pelo menos uma pessoa ou cargo antes de restringir o acesso.",
    whatsappLiteSessionMakePublic: "Tornar visível para todos",
    whatsappLiteSessionMakePrivate: "Salvar alterações",
    whatsappLiteConnectQr: "Ligar com QR",
    whatsappLiteDelete: "Remover número",
    whatsappLiteDeleteConfirmDescription:
      "Isto desliga o número e apaga as credenciais guardadas para este número WhatsApp. Não pode ser desfeito.",
    whatsappLiteQrTitle: "Ler código QR",
    whatsappLiteQrHelp:
      "No telemóvel: WhatsApp → Definições → Aparelhos ligados → Ligar aparelho. Leia o código abaixo.",
    whatsappLiteStatusDisconnected: "Desligado",
    whatsappLiteStatusQrPending: "À espera do QR",
    whatsappLiteStatusConnected: "Ligado",
    whatsappLiteStatusBanned: "Restrito",
    whatsappLiteEmptySessions: "Ainda não há números WhatsApp. Adicione um para iniciar o emparelhamento por QR.",
    whatsappLiteAutomation: "Agentes",
    whatsappLiteTabSessionsDesc: "Ligue e gira os números WhatsApp deste workspace.",
    whatsappLiteTabAutomationDesc:
      "Agente IA por número, criação automática de negociações, follow-ups e distribuição inteligente de contatos.",
    whatsappLiteTabFlowsDesc:
      "Regras visuais com gatilhos e ações quando chegam mensagens (mover ou copiar negociações, atribuir contatos, etc.).",
    whatsappLiteBindingsTitle: "Agente IA por número",
    whatsappLiteBindingsDesc:
      "Associe um agente a cada número para respostas automáticas, criação de negociações e follow-ups.",
    whatsappLiteBindingsEmpty:
      "Ainda não há agente configurado. Adicione um para activar respostas com IA e automação de CRM num número WhatsApp.",
    whatsappLitePause: "Pausar",
    whatsappLiteResume: "Retomar",
    whatsappLiteRefresh: "Atualizar",
    whatsappLiteEntityStatusActive: "Ativo",
    whatsappLiteEntityStatusPaused: "Em pausa",
    whatsappLiteEntityStatusDraft: "Rascunho",
    whatsappLiteEntityStatusRunning: "Em execução",
    whatsappLiteEntityStatusCompleted: "Concluída",
    whatsappLiteEntityStatusCancelled: "Cancelada",
    whatsappLiteEntityStatusFailed: "Falhou",
    whatsappLiteBindingModeAutoReply: "Resposta automática",
    whatsappLiteBindingModeFirstMessageOnly: "Só primeira mensagem",
    whatsappLiteBindingModeWorkflowTrigger: "Gatilho de workflow",
    whatsappLiteBindingScopeAllInbound: "Todas as mensagens recebidas",
    whatsappLiteCreateBinding: "Adicionar agente",
    whatsappLiteAgent: "Agente",
    whatsappLiteAgentChannelHint:
      "Cada binding deve usar um agente com o canal WhatsApp activo. O runtime usa esse agente para respostas e automação.",
    whatsappLiteNoAgentsWithWhatsappChannel:
      "Não foram encontrados agentes com WhatsApp activo. Active o WhatsApp num agente em Automação e actualize esta página.",
    whatsappLiteSession: "Número de WhatsApp",
    whatsappLiteModeAutoReply: "Resposta automática",
    whatsappLiteMaxRepliesDay: "Máx. respostas por dia",
    whatsappLiteStopPolling: "Fechar",
    whatsappLiteConnectedAs: "Ligado como {phone}",
    whatsappLitePickAgentSession: "Selecione um agente e um número WhatsApp.",
    whatsappLiteQrRequestFailed: "Não foi possível carregar o código QR do servidor.",
    whatsappLiteQrWaitingServer: "À espera que o servidor gere o código de emparelhamento…",
    whatsappLiteQrSlowHint:
      "Está a demorar mais do que o normal. Confirme se o serviço WhatsApp no backend está ativo e se o número está à espera do QR. Pode fechar e voltar a abrir «Ligar com QR».",
    whatsappLiteQrPairingFailed:
      "O WhatsApp fechou a ligação antes de mostrar o QR. Apague este número nas definições, confirme que o workspace-backend está a correr com uma versão de Node suportada e adicione um número WhatsApp novo.",
    whatsappLiteConnectModalTitle: "Adicionar número de WhatsApp",
    whatsappLiteConnectModalSubtitleBefore: "Conecte e gerencie o WhatsApp para o workspace ",
    whatsappLiteConnectModalSubtitleAfter: ".",
    whatsappLiteLabelPlaceholder: "Ex.: Vendas",
    whatsappLiteSyncHistoryTitle: "Sincronizar histórico de conversas",
    whatsappLiteSyncHistoryDesc: "Sincronizar automaticamente o histórico de conversas anteriores",
    whatsappLiteWhatsAppWeb: "WhatsApp Web",
    whatsappLiteMetaApiOfficial: "API oficial da Meta",
    whatsappLiteMetaApiComingSoon: "Em breve",
    whatsappLiteQrHelpBefore: "Entre no seu aplicativo do WhatsApp, vá em dispositivos conectados e clique em ",
    whatsappLiteQrHelpHighlight: "Conectar dispositivo",
    whatsappLiteQrHelpAfter: " no seu celular",
    whatsappLiteQrConnectionFailed:
      "Não foi possível estabelecer a conexão, por favor atualize o QR Code e tente novamente",
    whatsappLiteQrRefreshAria: "Atualizar código QR",
    whatsappLiteConnectedTitle: "{name} está conectado",
    whatsappLiteConnectedDesc: "Agora você já consegue usar o WhatsApp no seu workspace para realizar atendimentos.",
    whatsappLiteSetupLaterHint: "Você também pode configurar o número depois nas definições.",
    whatsappLiteDoItLater: "Fazer depois",
    whatsappLiteDisconnectBannerTitle: "Número de WhatsApp desconectado",
    whatsappLiteDisconnectBannerBody: "{label} está desconectado. Reconecte para continuar as conversas.",
    whatsappLiteDisconnectBannerSeeLater: "Ver depois",
    whatsappLiteDisconnectBannerTakeAction: "Resolver",
    whatsappLiteFinish: "Concluir",
    whatsappLiteEditBinding: "Editar agente por número",
    whatsappLiteAutoCreateLead: "Criar negociação automaticamente",
    whatsappLiteAutoCreateLeadHint:
      "Quando um contato novo não está ligado a uma negociação, cria uma no projeto e coluna abaixo. Se esse contato já tiver uma negociação nesse projeto, ela é reutilizada.",
    whatsappLiteBindingSendReply: "Permitir resposta automática no WhatsApp",
    whatsappLiteBindingSendReplyHint:
      "Quando activo, a resposta gerada pelo agente pode ser enviada ao contacto neste número WhatsApp. Desligue para executar o agente sem enviar mensagens.",
    whatsappLiteBindingSendReplyOn: "Resposta automática: ligada",
    whatsappLiteBindingSendReplyOff: "Resposta automática: desligada",
    whatsappLiteBindingAllowImageGeneration: "Permitir gerar/editar imagens",
    bindingPermissionsTitle: "O que o agente pode fazer além de responder",
    bindingPermissionsHint:
      "Por padrão o agente só responde este contato. Tudo abaixo vem desligado por segurança: quem escreve neste canal é de fora da sua equipe.",
    bindingWorkspaceAccess: "Dados do workspace",
    bindingWorkspaceAccessHint:
      "Cards, projetos e documentos. Com leitura, um contato pode obter essas informações perguntando ao agente.",
    bindingWorkspaceAccessNone: "Sem acesso",
    bindingWorkspaceAccessRead: "Leitura",
    bindingWorkspaceAccessReadWrite: "Leitura e alteração",
    bindingAllowMessagingOthers: "Enviar para outros contatos",
    bindingAllowMessagingOthersHint:
      "Permite que o agente mande mensagens de WhatsApp para outros números ou conversas (ex.: avisar o vendedor sobre um lead quente).",
    bindingAllowReadingOtherConversations: "Ver outras conversas",
    bindingAllowReadingOtherConversationsHint:
      "Permite que o agente liste e leia conversas de WhatsApp de outros contatos. Raramente necessário: um contato poderia perguntar sobre outros clientes.",
    whatsappLiteBindingAllowImageGenerationHint:
      "Quando ativado, o agente pode gerar ou editar imagens se o contacto pedir isso na conversa. Cada imagem tem um custo real — deixe desligado a menos que seja necessário.",
    whatsappLiteBindingWorkspaceAccessTitle: "Acesso ao workspace no WhatsApp",
    whatsappLiteBindingWorkspaceAccessDesc:
      "Por defeito, agentes no WhatsApp não podem ler nem alterar dados internos do workspace (documentos, cards, projetos). Active estas opções apenas para contactos de confiança, como corretores internos.",
    whatsappLiteBindingAllowEnumeration: "Permitir leitura de dados do workspace (documentos, biblioteca, projetos)",
    whatsappLiteBindingAllowEnumerationHint:
      "Liberta ferramentas de leitura como list_documents e get_document para o agente responder com a biblioteca completa — não só excertos da pesquisa semântica.",
    whatsappLiteBindingAllowWrites: "Permitir criar e atualizar dados no workspace",
    whatsappLiteBindingAllowWritesHint:
      "Também liberta ferramentas de escrita (criar/atualizar cards, documentos, etc.) a partir do WhatsApp. Requer a leitura acima. Use com cautela em contactos externos.",
    whatsappLiteBindingEnumerationOn: "Leitura da biblioteca: ligada",
    whatsappLiteBindingEnumerationOff: "Leitura da biblioteca: desligada",
    whatsappLiteBindingWritesOn: "Alterações no workspace: ligadas",
    whatsappLiteBindingWritesOff: "Alterações no workspace: desligadas",
    whatsappLiteAiAutomationRequiresPlan:
      "A automação WhatsApp com IA (respostas automáticas, encaminhamento por LLM, follow-ups escritos pelo agente) não está incluída no teu plano actual.",
    whatsappLiteFlowModalClose: "Fechar",
    whatsappLiteSelectPlaceholder: "Escolher…",
    whatsappLiteLeadProject: "Projeto",
    whatsappLiteLeadProjectSearch: "Pesquisar projetos…",
    whatsappLiteLeadProjectNoMatch: "Nenhum projeto corresponde à pesquisa.",
    whatsappLiteLeadCrmBoardsHint:
      "Depois escolha o board e a coluna CRM. Boards do tipo CRM aparecem primeiro, inclusive pipelines CRM dentro de projetos kanban.",
    whatsappLiteLeadBoard: "Board",
    whatsappLiteLeadColumn: "Coluna (fase)",
    whatsappLiteLeadSource: "Origem",
    whatsappLiteNoCrmProjects: "Não há projetos CRM neste workspace. Crie um projeto CRM primeiro.",
    whatsappLiteNoProjects: "Não há projetos neste workspace.",
    whatsappLitePickProjectColumn: "Escolha o projeto e a coluna da nova negociação.",
    whatsappLiteAutoLeadPriority: "Ajustar a prioridade da negociação pela atividade no WhatsApp",
    whatsappLiteAutoLeadPriorityHint:
      "Permite ao servidor atualizar a prioridade da negociação (frio / morno / quente) com base no engajamento, até haver workflows. Usa o campo de prioridade do CRM.",
    whatsappLiteBindingLeadLine: "Negociação automática: projeto «{project}»",
    whatsappLiteBindingLeadOff: "Negociação automática: desligada",
    whatsappLiteBindingPriorityOn: "Automação de prioridade: ligada",
    whatsappLiteBindingPriorityOff: "Automação de prioridade: desligada",
    whatsappLiteBindingUpdated: "Regra de automação actualizada",
    crmLeadSyncEnabled: "Atualizar a negociação automaticamente",
    crmLeadSyncActivate: "Ativar sincronização",
    crmLeadSyncEnabledHint:
      "Após conversas (com debounce), um agente de IA atualiza a tarefa ligada (descrição, etiquetas, telefone, etc). Não corre em todas as mensagens.",
    crmLeadSyncAgentLabel: "Agente de sincronização",
    crmLeadSyncAgentInherit: "Igual ao agente de entrada",
    crmLeadSyncInstructions: "O que o agente pode alterar",
    crmLeadSyncInstructionsPlaceholder:
      "ex.: Só atualizar descrição e etiquetas; não alterar prazo sem confirmação do contacto.",
    crmLeadSyncInstructionsHint: "Vazio = comportamento padrão (só atualiza com informação nova relevante).",
    crmLeadSyncAllowedFields: "Campos permitidos",
    crmLeadSyncAllowedFieldsHint: "Campos desmarcados não devem ser modificados.",
    crmLeadSyncTriggers: "Quando agendar sincronização",
    crmLeadSyncTriggerAfterReply: "Depois da resposta do agente",
    crmLeadSyncTriggerAfterInbound: "Depois de cada mensagem recebida (debounce)",
    crmLeadSyncTriggerIdle: "Quando a conversa ficar inativa",
    crmLeadSyncMinInterval: "Intervalo mínimo (minutos)",
    crmLeadSyncMinIntervalHint: "Evita reescrever o lead em todas as mensagens.",
    crmLeadSyncModel: "Modelo",
    crmLeadSyncFieldDescription: "Descrição",
    crmLeadSyncFieldLabels: "Etiquetas",
    crmLeadSyncFieldEmail: "Email",
    crmLeadSyncFieldPhone: "Telefone",
    crmLeadSyncFieldDeadline: "Prazo",
    crmLeadSyncFieldContactName: "Nome do contacto",
    crmLeadSyncFieldCompany: "Empresa",
    crmLeadSyncFieldName: "Título do card",
    crmLeadSyncFieldCustomFields: "Personalizados",
    whatsappLiteFollowupMaxHint: "1 = uma mensagem. Máx. 10.",
    whatsappLiteFollowupSendAtTime: "Enviar às (hora local)",
    whatsappLiteFollowupSendAtTimeHint: "Envia na próxima ocorrência deste horário (fuso do workspace).",
    whatsappLiteFollowupRequireBusinessHours: "Só enviar no horário de atendimento do workspace",
    whatsappLiteFollowupMessagesPlaceholder: "Adicione uma mensagem por passo",
    whatsappLiteFollowupAddMessage: "Adicionar mensagem",
    whatsappLiteFollowupRemoveMessage: "Remover",
    whatsappLiteFollowupMessageN: "Mensagem {{n}}",
    whatsappLiteFollowupUseAgentConversationHint:
      "O agente gera cada follow-up com o contexto da conversa (assunto e último pedido). Deixe as mensagens fixas vazias. Se a IA não gerar texto, não enviamos mensagem genérica padrão.",
    whatsappLiteFollowupAgentFallbackHint:
      "Se deixado vazio, cai para outro agente já usado nesta regra, ou o agente atribuído à conversa — mas a geração por IA pode nem rodar sem um desses.",
    whatsappLiteFollowupMessagesOptionalWithAiHint:
      "Opcional aqui — qualquer rodada sem mensagem fixa abaixo será gerada pelo agente de IA.",
    whatsappLiteFollowupScheduleFromConversation: "Agendar com base na data da conversa",
    whatsappLiteFollowupScheduleFromConversationHint:
      "A IA extrai a data do evento/prazo do chat (só mês → dia 1, meio do ano → junho, etc.). Se não houver data, usa o atraso acima.",
    whatsappLiteFollowupDaysBeforeEvent: "Dias de antecedência",
    whatsappLiteFollowupOnEventDay: "No dia do evento",
    whatsappLiteFollowupEventOffsets: "Enviar estas rodadas antes do evento",
    whatsappLiteFollowupEventOffsetsHint:
      'Uma ou mais antecedências — ex.: 1 dia antes E 30 minutos antes enviam dois follow-ups separados. Use 0 para "no dia do evento".',
    whatsappLiteFollowupAddEventOffset: "Adicionar outra antecedência",
    whatsappLiteRuleTemplatesLinkedCardMode: "Modo de correspondência",
    whatsappLiteRuleTemplatesLinkedCardModeIn: "Está em…",
    whatsappLiteRuleTemplatesLinkedCardModeNotIn: "Não está em…",
    whatsappLiteRuleTemplatesLinkedCardHintNotIn:
      "Corresponde se o lead CRM ligado estiver fora de todas estas linhas projeto/coluna (OU). Sem lead ligado também corresponde.",
    whatsappLiteOutboundSourceText: "Texto livre",
    whatsappLiteOutboundSourceShortcut: "Atalho do workspace",
    whatsappLiteOutboundSourceMeta: "Template oficial Meta",
    whatsappLiteOutboundPickTemplate: "Selecionar template…",
    whatsappLiteOutboundTextPlaceholder: "Texto da mensagem",
    whatsappLiteOutboundTextOptional: "Pré-visualização / fallback opcional",
    whatsappLiteOutboundTemplateHint:
      "Ao selecionar um atalho ou template Meta, o texto é preenchido. Atalhos vão como mensagem normal; Meta usa HSM oficial quando o gateway Cloud API está disponível (senão envia o texto de pré-visualização).",
    whatsappLiteRuleTemplatesWhenLinkedCard: "Lead está no projeto / coluna…",
    whatsappLiteRuleTemplatesWhenNewLead: "Novo lead criado",
    whatsappLiteRuleTemplatesWhenNewLeadFunnel: "Novo lead no funil",
    whatsappLiteRuleTemplatesNewLeadScope: "Âmbito do novo lead",
    whatsappLiteRuleTemplatesNewLeadScopeWorkspace: "Qualquer funil (workspace)",
    whatsappLiteRuleTemplatesNewLeadScopeFunnel: "Funil específico",
    whatsappLiteRuleTemplatesNewLeadWorkspaceHint:
      "Dispara quando um lead CRM novo é criado neste inbound—pela auto-criação do binding da sessão ou pela ação Criar lead no CRM na mesma regra. Não corresponde quando liga ou reutiliza um cartão existente.",
    whatsappLiteRuleTemplatesNewLeadFunnelHint:
      "Dispara quando um novo lead é criado no projeto selecionado, incluindo quando Criar lead no CRM nesta regra criaria um. Deixe colunas vazias para qualquer coluna do board nesse projeto.",
    whatsappLiteRuleTemplatesLinkedCardHint:
      "Corresponde se o lead CRM ligado estiver em qualquer uma destas linhas projeto/coluna (OU). Deixe colunas vazias para qualquer coluna do projeto.",
    whatsappLiteRuleTemplatesLinkedCardRow: "Projeto/coluna {{n}}",
    whatsappLiteRuleTemplatesAnyColumn: "Qualquer coluna",
    whatsappLiteRuleTemplatesAddLinkedCardOr: "Adicionar projeto/coluna (OU)",
    whatsappLiteRuleTemplatesConditionsMatch: "Combinar condições",
    whatsappLiteRuleTemplatesMatchAll: "Todas (E)",
    whatsappLiteRuleTemplatesMatchAny: "Qualquer (OU)",
    whatsappLiteFollowupEnabled: "Ativar follow-up automático",
    whatsappLiteFollowupEnabledHint: "Quando o lead não responde a tempo.",
    whatsappLiteFollowupAllowAgentScheduling: "Permitir que o agente agende follow-ups sob demanda",
    whatsappLiteFollowupAllowAgentSchedulingHint:
      'Permite que o agente agende ou reagende o follow-up desta conversa quando pedido no chat (ex: "me chame em 5 minutos"), independente do agendamento automático acima.',
    whatsappLiteFollowupOnlyWhenLinkedCard: "Somente quando o card CRM vinculado estiver nas colunas",
    whatsappLiteFollowupOnlyWhenLinkedCardHint:
      "Follow-ups são agendados e enviados só se o card vinculado da conversa estiver (ou não estiver) nas colunas selecionadas. Alterar isso cancela follow-ups pendentes.",
    whatsappLiteFollowupOnlyWhenLinkedCardNeedsProject:
      "Selecione pelo menos um projeto para a condição de coluna do follow-up.",
    whatsappLiteFollowupMax: "Máx. follow-ups",
    whatsappLiteFollowupFirstDelay: "Enviar após",
    whatsappLiteFollowupFirstDelayValue: "Valor do intervalo",
    whatsappLiteFollowupSubsequentDelay: "Intervalo entre follow-ups",
    whatsappLiteFollowupSubsequentDelayValue: "Valor do intervalo",
    whatsappLiteFollowupStopOnReply: "Parar follow-ups quando o contato responder",
    whatsappLiteFollowupUseAgent: "Usar agente IA para gerar mensagens de follow-up",
    whatsappLiteFollowupTimingModeAfter: "Após um intervalo",
    whatsappLiteFollowupTimingModeAt: "Num horário específico",
    whatsappLiteMaxRepliesInvalid: "Indique um máximo válido de respostas por dia (número ≥ 1).",
    whatsappLiteRuleTemplates: "Automações",
    whatsappLiteRuleTemplatesHint:
      "Monte regras visuais: quando chega uma mensagem, executa ações como mover ou copiar uma negociação, atribuir o contato ou alterar o estado da conversa. Ganha a primeira automação que fizer match.",
    whatsappLiteRuleTemplatesEmpty: "Ainda não há automações. Crie uma para executar acções quando chegam mensagens.",
    whatsappLiteRuleTemplatesAdd: "Nova automação",
    whatsappLiteRuleTemplatesName: "Nome",
    whatsappLiteRuleTemplatesSessionsLabel: "Números WhatsApp",
    whatsappLiteRuleTemplatesSessionsHint: "Só nos números seleccionados.",
    whatsappLiteRuleTemplatesSessionsEmpty: "Ligue primeiro um número WhatsApp para usar esta automação.",
    whatsappLiteRuleTemplatesSessionsRequired: "Escolha pelo menos um número WhatsApp para esta automação.",
    whatsappLiteRuleTemplatesSessionsChoose: "Escolher números…",
    whatsappLiteRuleTemplatesSessionsCountSelected: "{count} selecionados",
    whatsappLiteRuleTemplatesNoSessionsLinked: "Sem número seleccionado — esta automação não corre até a editar.",
    whatsappLiteRuleTemplatesPriority: "Prioridade",
    whatsappLiteRuleTemplatesStatus: "Estado",
    whatsappLiteRuleTemplatesStatusActive: "Ativo",
    whatsappLiteRuleTemplatesStatusPaused: "Em pausa",
    whatsappLiteRuleTemplatesRootJson: "Regras de entrada",
    whatsappLiteRuleTemplatesJsonError: "JSON inválido no DSL.",
    whatsappLiteRuleTemplatesCreateTitle: "Criar automação WhatsApp",
    whatsappLiteRuleTemplatesEditTitle: "Editar automação WhatsApp",
    smsLiteRuleTemplatesCreateTitle: "Criar automação SMS",
    smsLiteRuleTemplatesEditTitle: "Editar automação SMS",
    smsLiteTemplateFlowDragHint:
      "Arraste condições e acções para reordenar. Use + entre passos para adicionar uma condição.",
    smsLiteRuleTemplatesSessionsLabel: "Números SMS",
    smsLiteRuleTemplatesSessionsHint: "Só nos números seleccionados.",
    smsLiteRuleTemplatesSessionsEmpty: "Ligue primeiro um número SMS para usar esta automação.",
    smsLiteRuleTemplatesSessionsChoose: "Escolher números…",
    smsLiteRuleTemplatesSessionsCountSelected: "{count} selecionados",
    smsLiteRuleTemplatesNumberSearch: "Procurar números…",
    smsLiteRuleTemplatesNumberNoMatch: "Nenhum número corresponde à pesquisa.",
    smsLiteRuleTemplatesActionSendText: "Enviar mensagem fixa por SMS",
    smsLiteRuleTemplatesSendTextLabel: "Texto da mensagem SMS",
    instagramLiteRuleTemplatesCreateTitle: "Criar automação Instagram",
    instagramLiteRuleTemplatesEditTitle: "Editar automação Instagram",
    instagramLiteTemplateFlowDragHint: "Arraste ações para reordenar.",
    instagramLiteRuleTemplatesSessionsLabel: "Contas Instagram",
    instagramLiteRuleTemplatesSessionsHint: "Apenas contas selecionadas.",
    instagramLiteRuleTemplatesSessionsEmpty: "Conecte uma conta Instagram primeiro para usar esta automação.",
    instagramLiteRuleTemplatesSessionsChoose: "Escolher contas…",
    instagramLiteRuleTemplatesSessionsCountSelected: "{count} selecionadas",
    instagramLiteRuleTemplatesAccountSearch: "Buscar contas…",
    instagramLiteRuleTemplatesAccountNoMatch: "Nenhuma conta encontrada.",
    instagramLiteRuleTemplatesActionSendText: "Enviar mensagem fixa no Instagram",
    instagramLiteRuleTemplatesSendTextLabel: "Texto da mensagem Instagram",
    instagramLiteRuleTemplatesWhenComment: "Comentário Instagram num post",
    instagramLiteRuleTemplatesWhenCommentAll: "Qualquer post (incluindo futuros)",
    instagramLiteRuleTemplatesWhenCommentSelected: "Posts selecionados",
    instagramLiteRuleTemplatesCommentTextMatch: "Texto do comentário",
    instagramLiteRuleTemplatesCommentTextAny: "Qualquer texto de comentário",
    instagramLiteRuleTemplatesPostsBrowseAccount: "Buscar posts de",
    instagramLiteRuleTemplatesPostsFilter: "Filtrar pela legenda",
    instagramLiteRuleTemplatesPostsEmpty: "Nenhum post encontrado nesta conta.",
    instagramLiteRuleTemplatesPostsLoadMore: "Carregar mais posts",
    instagramLiteRuleTemplatesActionReplyToComment: "Responder no comentário",
    instagramLiteRuleTemplatesReplyLabel: "Texto da resposta",
    whatsappLiteRuleTemplatesActionCreateLead: "Criar lead no CRM",
    whatsappLiteRuleTemplatesActionCreateContact: "Criar contacto",
    whatsappLiteRuleTemplatesActionStopFlow: "Finalizar fluxo",
    whatsappLiteRuleTemplatesStopFlowHint:
      "Encerra esta mensagem aqui. Ações depois desta não rodam, e as automações seguintes não rodam neste round. Ações antes desta ainda rodam.",
    whatsappLiteRuleTemplatesCreateLeadSource: "Origem do lead (opcional)",
    whatsappLiteRuleTemplatesCreateLeadHint:
      "Cria uma negociação (cartão CRM) no projeto, board e coluna selecionados. Também cria ou liga um contacto do workspace com nome, telefone e identidade do canal. Se o binding da sessão já auto-cria leads, usar ambos pode criar cartões duplicados—prefira um ou outro.",
    whatsappLiteRuleTemplatesCreateContactHint:
      "Cria ou reutiliza um contacto do workspace a partir do telefone ou username Instagram desta conversa. Só o nome de exibição não basta para deduplicar contactos. Não cria cartão de negociação no CRM.",
    whatsappLiteRuleTemplatesSimulate: "Simular",
    whatsappLiteRuleTemplatesSimulateTitle: "Simulação (dry-run)",
    whatsappLiteRuleTemplatesSimMessage: "Mensagem de exemplo (inbound)",
    whatsappLiteRuleTemplatesSimInbound: "N.º de mensagens inbound do contacto",
    whatsappLiteRuleTemplatesSimSession: "Número WhatsApp (opcional)",
    whatsappLiteRuleTemplatesSimOptionalNumber: "Qualquer número ligado",
    whatsappLiteRuleTemplatesSimNumberHint:
      "Deixe em «qualquer» salvo se precisar de simular com uma inbox específica.",
    whatsappLiteRuleTemplatesSimClearNumber: "Limpar selecção",
    whatsappLiteRuleTemplatesNumberSearch: "Procurar números…",
    whatsappLiteRuleTemplatesNumberNoMatch: "Nenhum número corresponde à pesquisa.",
    whatsappLiteRuleTemplatesSimMatched: "Match — índice da regra: {index}",
    whatsappLiteRuleTemplatesSimNotMatched: "Nenhuma regra fez match.",
    whatsappLiteRuleTemplatesSimRuleIndex: "Índice da regra",
    whatsappLiteRuleTemplatesDelete: "Excluir automação",
    whatsappLiteRuleTemplatesDeleteConfirm: "Excluir esta automação? O encaminhamento deixará de a usar.",
    whatsappLiteRuleTemplatesSaved: "Automação guardada.",
    whatsappLiteRuleTemplatesCreated: "Automação criada.",
    whatsappLiteRuleTemplatesWorkflowIntro:
      "Monte as regras de cima para baixo: quando uma mensagem corresponde, as acções correm por ordem. No servidor ganha a primeira regra que faça match.",
    whatsappLiteRuleTemplatesRuleTitle: "Regra {n}",
    whatsappLiteRuleTemplatesRemoveRule: "Remover regra",
    whatsappLiteRuleTemplatesAddRule: "Adicionar outra regra",
    whatsappLiteRuleTemplatesWhenLabel: "Quando (condição)",
    whatsappLiteRuleTemplatesWhenFirstInbound: "Primeira mensagem do contacto nesta conversa",
    whatsappLiteRuleTemplatesWhenContains: "O texto contém…",
    whatsappLiteRuleTemplatesWhenNotContains: "O texto não contém…",
    whatsappLiteRuleTemplatesWhenRegex: "O texto corresponde a uma expressão regular",
    whatsappLiteRuleTemplatesWhenLlm: "O LLM classifica a mensagem (avançado)",
    whatsappLiteRuleTemplatesWhenLlmConversation: "IA classifica a conversa (avançado)",
    whatsappLiteRuleTemplatesWhenEventDateDaysAhead: "Data do evento / mudança está a … dias de hoje",
    whatsappLiteRuleTemplatesEventDateOpLabel: "Comparação",
    whatsappLiteRuleTemplatesEventDateDaysLabel: "Dias",
    whatsappLiteRuleTemplatesEventDateMatchIfMissing: "Também corresponder quando não houver data na conversa",
    whatsappLiteRuleTemplatesEventDateHint:
      "Extrai uma data da conversa (ex.: data de mudança) e compara dias corridos a partir de hoje. Prefira isto a pedir à IA para contar os dias.",
    whatsappLiteRuleTemplatesEventDateOpGt: "Mais de (>)",
    whatsappLiteRuleTemplatesEventDateOpGte: "Pelo menos (≥)",
    whatsappLiteRuleTemplatesEventDateOpLt: "Menos de (<)",
    whatsappLiteRuleTemplatesEventDateOpLte: "No máximo (≤)",
    whatsappLiteRuleTemplatesEventDateOpEq: "Exatamente (=)",
    whatsappLiteRuleTemplatesLlmConvPromptLabel: "Prompt de classificação",
    whatsappLiteRuleTemplatesLlmConvPromptPlaceholder:
      "Descreva o que a IA deve procurar na conversa, ex.: 'Classificar se a conversa menciona orçamento ou pedido de cotação'",
    whatsappLiteRuleTemplatesContainsPhrase: "Palavra ou frase",
    whatsappLiteRuleTemplatesIgnoreCase: "Ignorar maiúsculas/minúsculas",
    whatsappLiteRuleTemplatesRegexPatternLabel: "Padrão regex",
    whatsappLiteRuleTemplatesLlmLabelsLabel: "Possíveis classificações (separadas por vírgula)",
    whatsappLiteRuleTemplatesLlmLabelsDesc:
      "Liste todas as classificações possíveis que a IA pode escolher, ex.: preço, suporte, reclamação, outro",
    whatsappLiteRuleTemplatesLlmResultsHint:
      "Cada classificação tem o próprio caminho. O que não coincidir com nenhuma usa Caso contrário.",
    whatsappLiteRuleTemplatesLlmAddResult: "Adicionar classificação",
    whatsappLiteRuleTemplatesLlmTopPath: "Caminho de cima",
    whatsappLiteRuleTemplatesLlmMatchLabel: "Classificação que ativa esta regra",
    whatsappLiteRuleTemplatesLlmMatchDesc: "Qual das classificações acima deve ativar as ações desta regra",
    whatsappLiteRuleTemplatesLlmHintLabel: "Contexto adicional para a IA (opcional)",
    whatsappLiteRuleTemplatesLlmHintDesc:
      "Instruções extras para ajudar a IA a classificar corretamente, ex.: 'Considere mensagens pedindo preço como preço'",
    whatsappLiteRuleTemplatesActionsLabel: "Então (acções)",
    whatsappLiteRuleTemplatesAddActionAgent: "+ Executar agente",
    whatsappLiteRuleTemplatesAddActionMoveCard: "+ Mover card CRM ligado",
    whatsappLiteRuleTemplatesRemoveAction: "Remover ação",
    whatsappLiteRuleTemplatesActionType: "Ação",
    whatsappLiteRuleTemplatesSendReply: "Enviar resposta do agente ao WhatsApp (quando aplicável)",
    whatsappLiteRuleTemplatesMoveProject: "Projeto CRM (para listar colunas)",
    whatsappLiteRuleTemplatesMoveColumn: "Coluna de destino",
    whatsappLiteRuleTemplatesPickProject: "Escolha um projeto…",
    whatsappLiteRuleTemplatesPickColumn: "Escolha uma coluna…",
    whatsappLiteRuleTemplatesGroupSearch: "Buscar grupos…",
    whatsappLiteRuleTemplatesGroupNone: "Nenhum (responder ao contato)",
    whatsappLiteRuleTemplatesGroupNeedSession: "Ative um número WhatsApp nesta automação primeiro.",
    whatsappLiteRuleTemplatesChooseAgent: "Escolher agente",
    whatsappLiteRuleTemplatesPickAgent: "Escolha um agente…",
    whatsappLiteRuleTemplatesAgentSearch: "Pesquisar agentes…",
    whatsappLiteRuleTemplatesActionSearch: "Pesquisar acções…",
    whatsappLiteRuleTemplatesActionNoMatch: "Nenhuma acção corresponde à pesquisa.",
    whatsappLiteRuleTemplatesAgentNoMatch: "Nenhum agente corresponde à pesquisa.",
    whatsappLiteRuleTemplatesNoAgentsInWorkspace: "Ainda não há agentes neste workspace.",
    whatsappLiteRuleTemplatesEditorAdvanced: "Editar como JSON",
    whatsappLiteRuleTemplatesEditorVisual: "Voltar ao editor visual",
    whatsappLiteRuleTemplatesAdvancedHint: "Para condições aninhadas ou import JSON.",
    whatsappLiteRuleTemplatesAdvancedJson: "JSON bruto das regras",
    whatsappLiteRuleTemplatesUnsupported:
      "Este modelo usa condições que o editor visual ainda não suporta. Corrija o JSON ou simplifique as regras.",
    whatsappLiteRuleTemplatesValidationRule: "Adicione pelo menos uma regra.",
    whatsappLiteRuleTemplatesValidationWhen: "Preencha os campos da condição em cada regra.",
    whatsappLiteRuleTemplatesValidationWhenChatTypeOr:
      "“A conversa é…” não pode combinar com outras condições usando OU — use E, ou use só o tipo de conversa.",
    whatsappLiteRuleTemplatesValidationWhenLlmRequiresPlan:
      "Condições baseadas em LLM não estão disponíveis no teu plano actual. Altera a condição «quando» ou faz upgrade para guardar.",
    whatsappLiteRuleTemplatesValidationAction:
      "Cada ação precisa dos campos obrigatórios: agente, coluna, mensagem/template ou conteúdo de follow-up com IA.",
    whatsappLiteRuleTemplatesActionExecuteAgent: "Executar agente do workspace",
    whatsappLiteRuleTemplatesActionMoveCard: "Mover negociação ligada",
    whatsappLiteRuleTemplatesActionCloneCard: "Copiar negociação para um quadro",
    whatsappLiteRuleTemplatesActionSendText: "Resposta automática",
    whatsappLiteRuleTemplatesActionScheduleFollowup: "Agendar mensagens de follow-up",
    whatsappLiteRuleTemplatesActionAddLabel: "Adicionar etiqueta ao card",
    whatsappLiteRuleTemplatesActionSetLeadSource: "Definir origem do lead",
    whatsappLiteRuleTemplatesActionTransitionState: "Alterar estado da conversa",
    whatsappLiteRuleTemplatesActionDisableAutoReply: "Bloquear resposta automática",
    whatsappLiteRuleTemplatesActionEnableConversationAgent: "Activar agente de IA na conversa",
    whatsappLiteRuleTemplatesDisableAutoReplyHint:
      "Pausa respostas automáticas de IA para este lead (atendimento humano). Follow-ups são cancelados.",
    whatsappLiteRuleTemplatesEnableConversationAgentHint:
      "Define o agente desta conversa em cada nova mensagem recebida (equivalente a /agent on no chat). Pode alterar depois na inbox.",
    whatsappLiteRuleTemplatesActionDistributeLead: "Distribuir lead (CRM + responsável)",
    whatsappLiteRuleTemplatesActionAssignConversation: "Atribuir conversa",
    whatsappLiteRuleTemplatesActionRouteToCrm: "Encaminhar para coluna CRM",
    whatsappLiteRuleTemplatesAssignUserOptional: "Atribuir a (opcional)",
    whatsappLiteRuleTemplatesAssignUserPlaceholder: "Deixe vazio para distribuição inteligente",
    whatsappLiteRuleTemplatesAssignUserHint:
      "Escolha um membro da equipa ou use distribuição inteligente com as regras abaixo.",
    whatsappLiteRuleTemplatesAssignUserRoundRobin: "Distribuição inteligente (regras abaixo)",
    whatsappLiteRuleTemplatesAssignUserSearch: "Pesquisar membros…",
    whatsappLiteRuleTemplatesLabelText: "Nome da etiqueta",
    whatsappLiteRuleTemplatesLabelTextPlaceholder: "ex.: Orçamento, VIP, Urgente…",
    whatsappLiteRuleTemplatesLabelColor: "Cor da etiqueta",
    whatsappLiteRuleTemplatesLeadSourceText: "Nome da origem do lead",
    whatsappLiteRuleTemplatesLeadSourcePlaceholder: "ex.: WhatsApp Inbound, Indicação…",
    whatsappLiteRuleTemplatesTransitionStateLabel: "Estado alvo",
    whatsappLiteRuleTemplatesTransitionStateStopsAutoReply:
      "Este estado vai parar as respostas automáticas de IA para este lead.",
    whatsappLiteConvStateNewLead: "Novo lead",
    whatsappLiteConvStateQualifying: "Qualificando",
    whatsappLiteConvStateWaitingResponse: "Aguardando resposta",
    whatsappLiteConvStateNegotiating: "Negociando",
    whatsappLiteConvStateHumanHandoff: "Atendimento humano (para auto-resposta)",
    whatsappLiteConvStateFollowup: "Follow-up",
    whatsappLiteConvStateWon: "Ganho",
    whatsappLiteConvStateLost: "Perdido",
    whatsappLiteConvStateBlocked: "Bloqueado",
    whatsappLiteConvStateIdle: "Inativo",
    whatsappLiteRuleTemplatesFollowupMessages: "Mensagens de follow-up",
    whatsappLiteRuleTemplatesFollowupMessagesHint: "Uma mensagem por passo (espaços permitidos).",
    whatsappLiteRuleTemplatesAddActionSendText: "+ Enviar mensagem fixa",
    whatsappLiteRuleTemplatesAddActionFollowup: "+ Agendar follow-ups",
    whatsappLiteRuleTemplatesSendTextLabel: "Texto da mensagem",
    whatsappLiteRuleTemplatesSendTextHint: "Enviada como texto simples quando a regra faz match (sem IA).",
    whatsappLiteRuleTemplatesSendTextChainHint:
      "Para várias mensagens seguidas (1.ª resposta, 2.ª resposta, …), toque em «Adicionar passo» (+) e escolha «Enviar mensagem fixa» outra vez. Os passos correm da esquerda para a direita.",
    whatsappLiteRuleTemplatesConditionLabel: "Condição",
    whatsappLiteRuleTemplatesConditionAndHint: "Todas as condições têm de ser verdadeiras (E).",
    whatsappLiteRuleTemplatesWhenSearch: "Pesquisar condições…",
    whatsappLiteRuleTemplatesWhenNoMatch: "Nenhuma condição encontrada.",
    whatsappLiteTemplateFlowAddCondition: "Condição",
    whatsappLiteTemplateFlowAddActionMenu: "Ação",
    whatsappLiteTemplateFlowEndTitle: "Adicionar",
    whatsappLiteTemplateFlowDragHint:
      "Arraste condições e acções para reordenar. Use + entre passos para adicionar uma condição.",
    whatsappLiteTemplateFlowInspectorTitle: "Detalhe do passo",
    whatsappLiteTemplateFlowInspectorEmpty: "Seleccione um passo no fluxo.",
    whatsappLiteTemplateFlowTabFlow: "Fluxo visual",
    whatsappLiteTemplateFlowTabJson: "JSON",
    whatsappLiteTemplateFlowRulesSidebar: "Regras",
    whatsappLiteTemplateFlowNodeTriggerHeader: "Gatilho (quando)",
    whatsappLiteTemplateFlowTriggerEvent: "Evento",
    whatsappLiteTemplateFlowTriggerInbound: "Mensagem recebida",
    whatsappLiteTemplateFlowTriggerSent: "Mensagem enviada (humano ou agente da conversa)",
    whatsappLiteTemplateFlowTriggerTemplateSent: "Template enviado",
    whatsappLiteTemplateFlowTriggerComment: "Comentário recebido",
    whatsappLiteTemplateFlowCommentTriggerHint:
      "Isso já roda quando alguém comenta. Adicione uma condição só se quiser um filtro extra, como o texto do comentário. Escolha os posts abaixo.",
    whatsappLiteTemplateFlowAddBranch: "Adicionar ramificação",
    whatsappLiteTemplateFlowTriggerTextOp: "Filtro de texto",
    whatsappLiteTemplateFlowTriggerTextContains: "Contém",
    whatsappLiteTemplateFlowTriggerTextNotContains: "Não contém",
    whatsappLiteTemplateFlowTriggerTextNone: "Qualquer texto",
    whatsappLiteTemplateFlowTriggerInspectorHint:
      "Este cartão é o Evento seleccionado acima. Adicione filtros de texto e outras condições no fluxo — não no cabeçalho.",
    whatsappLiteTemplateFlowInsertCondition: "Adicionar condição aqui",
    whatsappLiteTemplateFlowBranchYes: "Sim",
    whatsappLiteTemplateFlowBranchNo: "Não",
    whatsappLiteTemplateFlowOtherwise: "Caso contrário",
    whatsappLiteTemplateFlowOtherwiseHint:
      "Caso contrário roda quando esta condição não acontece. Um classificador tem um caminho por rótulo, e o que sobrar usa Caso contrário.",
    whatsappLiteTemplateFlowNodeConditionHeader: "Condição {n}",
    whatsappLiteTemplateFlowNodeActionHeader: "Ação {n} (passo)",
    whatsappLiteTemplateFlowConfigValid: "Configurações válidas",
    whatsappLiteTemplateFlowConfigIncomplete: "Requer configuração",
    whatsappLiteTemplateFlowCloseInspector: "Fechar painel do passo",
    whatsappLiteDelayUnitMinutes: "Minutos",
    whatsappLiteDelayUnitHours: "Horas",
    whatsappLiteDelayUnitDays: "Dias",
    whatsappLiteDelayUnitWeeks: "Semanas",
    whatsappLiteDelayUnitMonths: "Meses",
    whatsappLiteSlaTitle: "SLA de Tempo de Resposta",
    whatsappLiteSlaDescription: "Defina limites de aviso e crítico para conversas sem resposta.",
    whatsappLiteSlaEnabled: "Ativar monitoramento de SLA",
    whatsappLiteSlaWarning: "Aviso após",
    whatsappLiteSlaCritical: "Crítico após",
    whatsappLiteSlaMinutes: "min",
    whatsappLiteSlaSaved: "Configurações de SLA salvas.",
    whatsappLiteSlaDefault: "Padrão",
    whatsappLiteSlaAddColumn: "Adicionar regra por coluna",
    whatsappLiteSlaProject: "Projeto",
    whatsappLiteSlaColumn: "Coluna",
    whatsappLiteSlaRemoveRule: "Remover",
    whatsappLiteSlaColumnRules: "Regras por coluna",
    whatsappLiteOutboundNamePrefixTitle: "Nome do atendente nas mensagens",
    whatsappLiteOutboundNamePrefixDescription:
      "Adiciona automaticamente o nome do atendente em negrito no início de cada mensagem enviada.",
    whatsappLiteOutboundNamePrefixEnabled: "Incluir nome do atendente nas mensagens",
    whatsappLiteOutboundNamePrefixSaved: "Configurações de mensagens salvas.",
    whatsappLiteLinkedLeadInboxTitle: "Só conversas com lead",
    whatsappLiteLinkedLeadInboxDescription:
      "Esconde no inbox e na lista do número as conversas que não estão vinculadas a um card.",
    whatsappLiteLinkedLeadInboxEnabled: "Esconder conversas sem card",
    whatsappLiteLinkedLeadInboxSaved: "Configurações de mensagens salvas.",
    messagingSlaTitle: "SLA de Tempo de Resposta",
    messagingSlaDescription: "Defina limites de aviso e crítico para conversas sem resposta.",
    messagingSlaDefault: "Padrão",
    messagingSlaWarning: "Aviso após",
    messagingSlaCritical: "Crítico após",
    messagingSlaMinutes: "min",
    messagingSlaColumnRules: "Regras por coluna",
    messagingSlaAddColumn: "Adicionar regra por coluna",
    messagingSlaProject: "Projeto",
    messagingSlaColumn: "Coluna",
    messagingSlaRemoveRule: "Remover",
    messagingSlaSaved: "Configurações de SLA salvas.",
    messagingOutboundNamePrefixTitle: "Nome do atendente nas mensagens",
    messagingOutboundNamePrefixDescription:
      "Adiciona automaticamente o nome do atendente no início de cada mensagem enviada.",
    messagingOutboundNamePrefixEnabled: "Incluir nome do atendente nas mensagens",
    messagingOutboundNamePrefixSaved: "Configurações de mensagens salvas.",
    blastCampaignsTab: "Campanhas",
    blastCampaignsTitle: "Campanhas em Massa",
    blastCampaignsDescription: "Envie mensagens sequenciais para múltiplos contatos",
    blastCampaignsCreate: "Nova Campanha",
    blastCampaignsEmpty: "Nenhuma campanha ainda. Crie uma para começar.",
    blastCampaignCreated: "Campanha criada",
    blastCampaignName: "Nome da campanha",
    blastCampaignDescription: "Descrição (opcional)",
    blastCampaignSession: "Número WhatsApp",
    blastCampaignSelectSession: "Selecione o número…",
    blastCampaignDailyLimit: "Limite diário",
    blastCampaignInterval: "Intervalo (seg)",
    blastCampaignCustomInterval: "Usar intervalo personalizado",
    blastCampaignCustomIntervalHint: "Milissegundos entre cada mensagem. Mínimo 50, máximo 5000.",
    blastCampaignIntervalMs: "Intervalo (ms)",
    blastCampaignIntervalInvalid: "O intervalo deve ficar entre 50 e 5000 milissegundos.",
    blastCampaignSecondsIntervalInvalid: "O intervalo deve ficar entre 5 e 3600 segundos.",
    blastCampaignIntervalNeedsSession: "Selecione o número para definir o intervalo.",
    blastCampaignEstimatedDuration: "Duração estimada: {duration}",
    blastCampaignEstimatedLeft: "cerca de {duration} restantes",
    blastCampaignDurationSeconds: "{count} s",
    blastCampaignDurationMinutes: "{count} min",
    blastCampaignDurationHours: "{count} h",
    blastCampaignDurationDays: "{count} d",
    blastCampaignAudience: "Fonte da audiência",
    blastCampaignAudienceManual: "Manual (adicionar depois)",
    blastCampaignAudienceProject: "Do projeto",
    blastCampaignAudienceCsv: "Upload de CSV",
    blastCampaignCsvUpload: "Carregar lista de telefones",
    blastCampaignCsvChooseFile: "Escolher ficheiro",
    blastCampaignCsvPhoneCount: "telefone(s) encontrado(s)",
    blastCampaignCsvRequired: "Carregue um ficheiro CSV com números de telefone.",
    blastCampaignAudienceProjectLabel: "Projeto",
    blastCampaignAudienceBoardLabel: "Quadro",
    blastCampaignAudienceColumnLabel: "Coluna",
    blastCampaignAudienceCardFiltersHint: "Opcional. Mesmos filtros do quadro do projeto.",
    blastCampaignSequence: "Sequência de Mensagens",
    blastCampaignAddStep: "Adicionar etapa",
    blastCampaignStep: "Etapa",
    blastCampaignSteps: "etapas",
    blastCampaignSent: "enviadas",
    blastCampaignDelay: "Atraso (horas)",
    blastCampaignMessagePlaceholder: "Conteúdo da mensagem...",
    blastCampaignSkipIfReplied: "Pular se já respondeu",
    blastCampaignTransportBaileys: "Baileys",
    blastCampaignTransportCloud: "Meta Cloud API",
    blastCampaignStepMode: "Tipo de mensagem",
    blastCampaignStepModeFreeform: "Mensagem livre",
    blastCampaignStepModeTemplate: "Template",
    blastCampaignTemplate: "Template",
    blastCampaignSelectTemplate: "Selecione um template",
    blastCampaignNoTemplates: "Nenhum template disponível para este número.",
    blastCampaignTemplateRequired: "Selecione um template para cada etapa de template.",
    blastCampaignCloudTemplateOnlyHint: "Números Cloud API só podem enviar templates aprovados pela Meta em campanhas.",
    blastCampaignTemplateVars: "Variáveis",
    blastCampaignVarCrmField: "Campo do CRM",
    blastCampaignVarCrmFieldManual: "Apenas manual / padrão",
    blastCampaignVarDefault: "Valor padrão",
    blastCampaignVarDefaultPlaceholder: "Usado quando o campo do CRM está vazio",
    blastCampaignTemplatePreview: "Pré-visualização",
    blastCampaignCrmFieldTitle: "Título do card",
    blastCampaignCrmFieldContactName: "Nome do contato",
    blastCampaignCrmFieldEmail: "Email",
    blastCampaignCrmFieldPhone: "Telefone",
    blastCampaignCrmFieldCompany: "Empresa",
    blastCampaignCrmFieldRole: "Cargo",
    blastCampaignCrmFieldIndustry: "Setor",
    blastCampaignCrmFieldEstimateRevenue: "Receita estimada",
    blastCampaignCrmFieldMessage: "Mensagem",
    blastCampaignStart: "Iniciar",
    blastCampaignPause: "Pausar",
    blastCampaignCancel: "Cancelar",
    blastCampaignNameRequired: "Nome é obrigatório",
    blastCampaignSessionRequired: "O número WhatsApp é obrigatório",
    blastCampaignStepRequired: "Pelo menos uma etapa de mensagem é necessária",
    blastCampaignDailyLimitInvalid: "Limite diário deve ser um número positivo",
    blastCampaignDeleteConfirm: "Isso excluirá permanentemente esta campanha. Esta ação não pode ser desfeita.",
    blastCampaignEdit: "Editar campanha",
    blastCampaignEditTitle: "Editar campanha",
    blastCampaignSave: "Guardar alterações",
    blastCampaignUpdated: "Campanha atualizada",
    blastCampaignEditLimitedHint: "Já há mensagens enviadas. Só pode alterar nome, descrição, limite e intervalo.",
    blastCampaignPostSendTitle: "Depois de enviar a cada lead",
    blastCampaignPostSendHint: "Requer cartão CRM associado.",
    blastCampaignPostSendEnable: "Mover cartão do lead para uma coluna",
    blastCampaignPostSendProject: "Projeto CRM",
    blastCampaignPostSendBoard: "Board",
    blastCampaignPostSendColumn: "Coluna de destino",
    blastCampaignPostSendSelectProject: "Selecionar projeto…",
    blastCampaignPostSendSelectColumn: "Selecionar coluna…",
    blastCampaignPostSendColumnsLoading: "A carregar colunas…",
    blastCampaignPostSendColumnRequired: "Escolha a coluna de destino para a ação pós-envio.",
    blastCampaignPostSendCrmAudienceHint: "Só para leads com cartão CRM.",
    blastCampaignPostSendSummary: "move cartão após envio",
    blastCampaignFailed: "falharam",
    blastCampaignRetryFailed: "Retentar falhas",
    blastCampaignViewFailures: "Ver contactos com falha",
    blastCampaignFailuresDialogTitle: "Contactos com falha",
    blastCampaignFailuresDialogSubtitle:
      "Veja porque cada envio falhou, tente novamente ou mova o cartão do contacto para outra coluna.",
    blastCampaignRetryOne: "Tentar novamente",
    blastCampaignRetryOneSuccess: "Contacto colocado na fila para nova tentativa",
    blastCampaignMoveContact: "Mover para coluna",
    blastCampaignMoveContactConfirm: "Mover",
    blastCampaignMoveContactSuccess: "Cartão movido",
    blastCampaignNoLinkedCard: "Sem cartão associado para mover",
    blastCampaignFailedReasonUnknown: "Erro desconhecido",
    blastCampaignMoveAllFailed: "Mover todos os {count} contactos com falha para uma coluna",
    blastCampaignMoveAllFailedSuccess: "{count} cartão(ões) movido(s)",
    blastCampaignMoveAllFailedPartial: "{moved} cartão(ões) movido(s), {failed} falhou(aram)",
    blastCampaignAttachmentsHint:
      "Vários ficheiros são enviados como mensagens WhatsApp separadas (máx. {count} por etapa, 20 MB cada).",
    blastCampaignAddAttachment: "Carregar ficheiro",
    blastCampaignFromLibrary: "Da biblioteca",
    blastCampaignAttachmentMax: "Máximo de {count} anexos por etapa",
    blastCampaignAttachmentTooLarge: "Ficheiro excede o limite de 20 MB para envio no WhatsApp",
    blastCampaignAttachmentInvalidType: "Tipo de ficheiro não permitido em campanhas blast",
    blastCampaignAttachmentDropHint: "Arraste ficheiros para aqui ou use o botão de anexo",
    blastCampaignAttachmentUploading: "A carregar…",
    blastCampaignAttachmentUploadFailed: "Falha no carregamento",
    workspaceNameRequired: "Nome do workspace é obrigatório",
    workspaceDetailsUpdated: "Detalhes do workspace atualizados com sucesso",
    businessHoursTitle: "Horário de atendimento",
    businessHoursDescription:
      "Defina quando a equipa está disponível. Usado nas regras inbound do WhatsApp e noutras automações.",
    businessHoursEnabled: "Ativar horário de atendimento",
    businessHoursTimezone: "Fuso horário",
    businessHoursAddWindow: "Adicionar intervalo",
    businessHoursRemoveWindow: "Remover",
    businessHoursStart: "Das",
    businessHoursEnd: "Até",
    businessHoursSaved: "Horário de atendimento guardado",
    businessHoursMonday: "Segunda-feira",
    businessHoursTuesday: "Terça-feira",
    businessHoursWednesday: "Quarta-feira",
    businessHoursThursday: "Quinta-feira",
    businessHoursFriday: "Sexta-feira",
    businessHoursSaturday: "Sábado",
    businessHoursSunday: "Domingo",
    whatsappLiteRuleTemplatesWhenWithinBusinessHours: "Dentro do horário de atendimento",
    whatsappLiteRuleTemplatesWhenOutsideBusinessHours: "Fora do horário de atendimento",
    whatsappLiteRuleTemplatesWhenChatType: "A conversa é…",
    whatsappLiteRuleTemplatesDirectOnlyHint:
      'Esta regra não tem condição de "Tipo de conversa", então só se aplica a mensagens diretas — nunca vai disparar em grupos. Adicione uma condição de "Tipo de conversa" para incluir grupos.',
    whatsappLiteRuleTemplatesWhenChatTypeDirect: "Direta (1:1)",
    whatsappLiteRuleTemplatesWhenChatTypeGroup: "Grupo",
    whatsappLiteRuleTemplatesWhenChatTypeAny: "Direta ou grupo",
    whatsappLiteRuleTemplatesWhenChatTypeHint:
      "Combine com outras condições (E) para automações só de grupo ou só diretas. Regras sem esta condição continuam só em conversas diretas.",
    whatsappLiteRuleTemplatesWhenChatTypeDisabled:
      "Condições de grupo estão desativadas enquanto “Ocultar mensagens de grupo” estiver ligado.",
    whatsappLiteRuleTemplatesWhenFromGroup: "Mensagem é de grupo(s)",
    whatsappLiteRuleTemplatesWhenFromGroupMode: "Corresponde a",
    whatsappLiteRuleTemplatesWhenFromGroupLabel: "Grupo(s)",
    whatsappLiteRuleTemplatesWhenFromGroupHint:
      "Corresponde quando o grupo da mensagem recebida é um dos selecionados.",
    whatsappLiteRuleTemplatesWhenFromPhone: "Mensagem é de número(s) de telefone",
    whatsappLiteRuleTemplatesWhenFromPhoneMode: "Corresponde a",
    whatsappLiteRuleTemplatesWhenFromPhoneLabel: "Número(s) de telefone / contato(s)",
    whatsappLiteRuleTemplatesWhenFromAd: "Veio de um anúncio (Click-to-WhatsApp)",
    whatsappLiteRuleTemplatesWhenFromAdHint:
      "Só os números ligados pela API oficial do WhatsApp recebem o anúncio que trouxe o contacto.",
    whatsappLiteRuleTemplatesWhenFromAdMatch: "Que anúncios",
    whatsappLiteRuleTemplatesWhenFromAdAny: "Qualquer anúncio",
    whatsappLiteRuleTemplatesWhenFromAdIds: "Anúncios específicos (IDs)",
    whatsappLiteRuleTemplatesWhenFromAdCampaigns: "Campanha é (IDs de campanha)",
    whatsappLiteRuleTemplatesWhenFromAdCampaignsHint:
      "Precisa da integração Meta Ads no projeto do lead (os IDs de campanha estão no Gerenciador de Anúncios).",
    whatsappLiteRuleTemplatesWhenFromAdHeadline: "Título do anúncio contém",
    whatsappLiteRuleTemplatesWhenFromAdScope: "Aplica-se a",
    whatsappLiteRuleTemplatesWhenFromAdScopeMessage: "A mensagem enviada a partir do anúncio",
    whatsappLiteRuleTemplatesWhenFromAdScopeConversation: "Qualquer mensagem de uma conversa vinda de anúncio",
    whatsappLiteRuleTemplatesAdTokensHint:
      "Os campos do anúncio são preenchidos quando a conversa veio de um anúncio Click-to-WhatsApp; caso contrário ficam vazios.",
    whatsappLiteRuleTemplatesWhenFromPhoneHint:
      "Separados por vírgula. Qualquer formato funciona — só os dígitos são comparados.",
    whatsappLiteRuleTemplatesWhenModeIn: "É um dos",
    whatsappLiteRuleTemplatesWhenModeNotIn: "Não é nenhum dos",
    whatsappLiteRuleTemplatesActionSendToRecipients: "Enviar mensagem a contatos",
    whatsappLiteRuleTemplatesRecipients: "Destinatários",
    whatsappLiteRuleTemplatesRecipientAssignee: "Responsável pelo card",
    whatsappLiteRuleTemplatesRecipientReporter: "Criador do card",
    whatsappLiteRuleTemplatesRecipientCardHint: "Só resolve quando esta conversa está vinculada a um card do CRM.",
    whatsappLiteRuleTemplatesRecipientUsers: "Utilizadores do workspace",
    whatsappLiteRuleTemplatesRecipientUsersPlaceholder: "Selecionar utilizadores",
    whatsappLiteRuleTemplatesRecipientUsersSearch: "Buscar utilizadores…",
    whatsappLiteRuleTemplatesRecipientCustomPhones: "Números de telefone customizados",
    whatsappLiteRuleTemplatesRecipientGroups: "Grupo(s)",
    whatsappLiteRuleTemplatesRecipientGroupsHint: "Selecione um ou mais grupos do WhatsApp para notificar.",
    whatsappLiteBindingAllowGroupAutoReply: "Também responder automaticamente em grupos",
    whatsappLiteBindingAllowGroupAutoReplyHint:
      "Opcional. Escolha todos os grupos deste número, ou selecione grupos específicos. Isto só controla a auto-resposta do agente — não esconde grupos da inbox. Exige “Mostrar mensagens de grupo na inbox” ligado.",
    whatsappLiteBindingGroupsPickRequired: "Selecione pelo menos um grupo, ou mude para “todos os grupos”.",
    whatsappLiteBindingAllowGroupAll: "Todos os grupos deste número",
    whatsappLiteBindingAllowGroupPick: "Apenas grupos selecionados",
    whatsappLiteBindingGroupsEmpty: "Ainda não há grupos para este número. Abra a inbox depois de entrar nos grupos.",
    whatsappLiteBindingGroupsDisabled:
      "Ligue “Mostrar mensagens de grupo na inbox” para configurar auto-reply em grupos.",
    whatsappLiteBindingGroupsLoading: "A carregar definições da inbox…",
    whatsappLiteRuleTemplatesSimChatType: "Simular como…",
    whatsappLiteInboxHideGroupsAutomationHint:
      "Se os grupos estiverem ocultos nas definições da inbox, automações e auto-reply de grupo ficam bloqueados — mesmo que já estivessem ativados.",
    failedToUpdateWorkspace: "Falha ao atualizar detalhes do workspace",

    letterheadTitle: "Timbrado (Letterhead)",
    letterheadDescription: "Configure o cabeçalho e rodapé para documentos PDF gerados pelo agente.",
    letterheadEnabled: "Ativar timbrado nos PDFs",
    letterheadEnabledHint: "Quando ativado, todos os PDFs gerados pelo agente terão o cabeçalho e rodapé configurados.",
    letterheadCompanyName: "Nome da empresa",
    letterheadCompanyNamePlaceholder: "Nome da empresa para o cabeçalho",
    letterheadLogo: "Logo",
    letterheadLogoUpload: "Enviar logo",
    letterheadLogoUploading: "A enviar…",
    letterheadLogoRemove: "Remover logo",
    letterheadLogoHint: "PNG ou JPG. O logo enviado é armazenado e usado nos PDFs gerados.",
    letterheadPrimaryColor: "Cor principal",
    letterheadInvalidColor: "Cor primária inválida. Use formato hexadecimal (#000000).",
    letterheadHeaderLayout: "Layout do cabeçalho",
    letterheadLayoutLeft: "Esquerda (logo + nome lado a lado)",
    letterheadLayoutCenter: "Centralizado",
    letterheadLayoutMinimal: "Minimalista (sem bordas)",
    letterheadFooterText: "Texto do rodapé",
    letterheadFooterPlaceholder: "CNPJ: …, Tel: …, email@empresa.com",
    letterheadFooterHint: "Aparece no rodapé de todos os PDFs gerados.",
    letterheadSaved: "Timbrado salvo com sucesso.",
    letterheadSaveError: "Erro ao salvar timbrado.",

    documentTemplatesTitle: "Templates de documentos",
    documentTemplatesDescription:
      "Faça upload de templates .docx ou .html com placeholders para o agente preencher automaticamente.",
    documentTemplatesAdd: "Adicionar",
    documentTemplatesName: "Nome do template",
    documentTemplatesNamePlaceholder: "Ex: Relatório de horas de suporte",
    documentTemplatesDescriptionOptional: "Descrição (opcional)",
    documentTemplatesDescriptionPlaceholder: "Breve descrição do template",
    documentTemplatesCategory: "Categoria",
    documentTemplatesCategoryInvoice: "Fatura",
    documentTemplatesCategoryReport: "Relatório",
    documentTemplatesCategoryProposal: "Proposta",
    documentTemplatesCategorySupportHours: "Horas de suporte",
    documentTemplatesCategoryContract: "Contrato",
    documentTemplatesCategoryOther: "Outro",
    documentTemplatesFile: "Arquivo .docx ou .html",
    documentTemplatesSelectFile: "Selecionar arquivo",
    documentTemplatesPlaceholderHint:
      'Word: {placeholder}. HTML: data-slot="name" (ou {{name}}) para campos que o agente deve preencher.',
    documentTemplatesUpload: "Enviar template",
    documentTemplatesUploading: "Enviando…",
    documentTemplatesUploadSuccess: "Template enviado com sucesso!",
    documentTemplatesUploadError: "Erro ao enviar template",
    documentTemplatesUploadValidation: "Preencha o nome e selecione um arquivo .docx ou .html",
    documentTemplatesDeleteSuccess: "Template removido",
    documentTemplatesDeleteError: "Erro ao remover template",
    documentTemplatesLoading: "Carregando templates…",
    documentTemplatesEmpty: "Nenhum template cadastrado",
    documentTemplatesEmptyHint: "Faça upload de um arquivo .docx ou .html para o agente usar como modelo.",
    documentTemplatesFields: "Campos",
    documentTemplatesKindHtml: "HTML",
    documentTemplatesKindDocx: "Word",

    whatsappLiteBindingAutoReplyScope: "Chats com auto-resposta",
    whatsappLiteBindingAutoReplyScopeHint: "Escolha se o agente responde em chats diretos, grupos ou ambos.",
    whatsappLiteBindingAutoReplyScopeDirect: "Apenas chats diretos",
    whatsappLiteBindingAutoReplyScopeGroup: "Apenas grupos",
    whatsappLiteBindingAutoReplyScopeBoth: "Chats diretos e grupos",

    // Danger zone
    dangerZone: "Zona de Perigo",
    deleteWorkspace: "Excluir meu workspace",
    permanentlyDeleteWorkspace: "Excluir permanentemente o workspace",
    changeWorkspaceLogo: "Alterar logo do workspace",
    workspaceLogoAlt: "Logo do workspace",
    customBrandingTitle: "Cor da barra lateral",
    customBrandingDescription:
      "Defina a cor de destaque usada no gradiente da barra lateral. Escolha qualquer cor ou use o padrão para manter o tema JSYNQ.",
    customBrandingEnabled: "Usar identidade visual personalizada",
    customBrandingEnabledHint: "Aplica a cor de destaque escolhida ao gradiente da barra lateral.",
    customBrandingSidebarColor: "Cor de destaque",
    customBrandingSidebarColorHint: "Essa cor se mistura na barra lateral de cima para baixo.",
    customBrandingUseDefaultColor: "Usar padrão",
    customBrandingColorStyle: "Estilo",
    customBrandingColorStyleGradient: "Gradiente",
    customBrandingColorStyleSolid: "Sólido",
    customBrandingLogoHint:
      "O logo do workspace é gerenciado em Configurações do workspace — ele aparece na barra lateral quando há uma cor de destaque personalizada.",
    customBrandingSaved: "Cor da barra lateral salva",
    customBrandingInvalidColor: "Informe uma cor hexadecimal válida (ex.: #45AD7E)",

    // General
    createdAt: "Criado em",

    // Delete modal
    confirmAction: "Confirmar ação",
    deleteWorkspaceWarning:
      "Se você excluir seu workspace, perderá permanentemente seu perfil, projetos, documentos e todo o trabalho realizado.",
    deleteWorkspaceConfirmation: "Tem certeza de que deseja excluir {workspaceName}? Esta ação não pode ser desfeita.",
    typeDeleteToConfirm: "Digite DELETE para confirmar",
    deleteWorkspaceButton: "Excluir Workspace",

    // Sidebar
    backToWorkspace: "Voltar ao workspace",
    billing: "Cobrança",
    settings: "Configurações",
    account: "Conta",
    members: "Membros",
    integrations: "Integrações",
    oauthApps: "Apps OAuth",
    agentDigestNav: "Resumo pelo agente",
    calendarAccessGoogleNotConnected: "Nenhum Google Calendar conectado neste workspace.",
    calendarAccessGoogleCalendarsHint: "Também ler eventos da conta Google conectada.",
    calendarAccessGoogleCalendarsTitle: "Incluir Google Calendars conectados",
    calendarAccessLoadingMore: "A carregar mais…",
    calendarAccessEmptyResults: "Sem resultados.",
    calendarAccessSearchPlaceholder: "Pesquisar…",
    calendarAccessSelectedCountTemplate: "{{count}} selecionados",
    calendarAccessPickUsers: "Buscar e selecionar membros do workspace",
    calendarAccessScopeUsersDescription: "Escolha de quais membros do workspace o agente pode ver as reuniões.",
    calendarAccessScopeUsersTitle: "Pessoas específicas",
    calendarAccessScopeWorkspaceDescription: "Reuniões de todos os membros do workspace.",
    calendarAccessScopeWorkspaceTitle: "Workspace inteiro",
    calendarAccessScopeOwnerDescription: "Apenas as reuniões do dono do agente.",
    calendarAccessScopeOwnerTitle: "Só o meu",
    calendarAccessScopeLabel: "Calendário de quem",
    calendarAccessCanScheduleHint: "Verificar horários livres/ocupados e criar, editar ou cancelar reuniões.",
    calendarAccessCanScheduleTitle: "Verificar disponibilidade e agendar",
    calendarAccessCanListHint: "Administrativo — ver e enumerar detalhes de reuniões existentes.",
    calendarAccessCanListTitle: "Listar reuniões",
    calendarAccessEnabledHint: "Sem isso, o agente não tem acesso nenhum a reuniões ou calendários.",
    calendarAccessEnabledTitle: "Ativar tools de calendário",
    whatsappLiteBindingCalendarAccessOverrideHint:
      "Usar permissões de calendário específicas desta automação em vez das definições do próprio agente.",
    whatsappLiteBindingCalendarAccessOverride: "Substituir aqui o acesso ao calendário do agente",
    mcpConnections: "Conexões MCP",

    // Billing
    planDetails: "Detalhes do plano",
    activeMembers: "Você atualmente tem {count} {memberText} ativo(s) em seu workspace.",
    member: "membro",
    daysLeftInTrial: "({days} {dayText} restante(s) no trial)",
    day: "dia",
    days: "dias",
    currentPlan: "Plano atual",
    addPaymentMethod: "Adicionar método de pagamento",
    managePlan: "Gerenciar plano",
    contactSupportToSwitchPlans: "Entre em contato com o suporte para mudar para este plano",
    switchPlan: "Mudar para este plano",
    switchPlanConfirmTitle: "Mudar de plano?",
    switchPlanConfirmDescription:
      "Você está prestes a mudar para {plan}. A diferença de preço será rateada e cobrada ou creditada imediatamente.",
    switchPlanSuccess: "Plano alterado com sucesso.",
    switchPlanError: "Algo deu errado ao mudar de plano.",
    switching: "Mudando...",
    confirm: "Confirmar",
    downgradeInDevelopment: "Downgrade em desenvolvimento...",
    upgradeTo: "Upgrade para {plan} {interval}",
    downgradeTo: "Downgrade para {plan} {interval}",
    startTrial: "Iniciar trial",
    oneTrialPerWorkspace: "* Um trial por workspace. Sem reativação após o término.",
    startTrialModalTitle: "Comece seu trial gratuito de 14 dias e desbloqueie todo o potencial do JSYNQ.",
    startTrialModalSubtitle:
      "Reduza o trabalho repetitivo e aumente a colaboração para maximizar o impacto do seu time",
    startTrialModalFeaturesHeading: "Desbloqueie todos os recursos do JSYNQ Pro:",
    startTrialModalFeatureAiIntegration: "Integração com IA",
    startTrialModalFeatureUnlimitedProjects: "Projetos ilimitados",
    startTrialModalFeaturePeoplePerMeeting: "100 pessoas por reunião",
    startTrialModalFeaturePrivateTasks: "Tarefas privadas",
    startTrialModalFeatureUnlimitedRoles: "Cargos ilimitados",
    startTrialModalFeatureMeetingTranscripts: "Transcrição de reuniões",
    startTrialModalFeatureJsynqAi: "JSYNQ AI",
    startTrialModalFeaturePrioritySupport: "Suporte prioritário",
    startTrialModalFeatureAndMore: "E muito mais",
    startTrialModalFeatureTimeInsights: "Insights avançados de tempo",
    startTrialModalCancel: "Cancelar",
    startTrialModalViewPlans: "Ver planos",
    startTrialModalStartFreeTrial: "Iniciar trial gratuito",
    startTrialModalPaymentTitle: "Adicione um método de pagamento",
    startTrialModalPaymentSubtitle: "Você não será cobrado até o fim do seu trial de 14 dias. Cancele quando quiser.",
    startTrialModalPaymentCardLabel: "Dados do cartão",
    startTrialModalBack: "Voltar",
    startTrialModalConfirmStartTrial: "Iniciar trial gratuito",
    startTrialModalSuccessTitle: "Seu trial gratuito foi iniciado",
    startTrialModalSuccessSubtitle: "Agora você tem 14 dias de acesso completo a todos os recursos pagos.",
    startTrialModalGotIt: "Entendi!",
    startTrialModalGenericError: "Algo deu errado. Por favor, tente novamente.",
    perUserPerMonth: "por usuário/mês",
    perWorkspacePerMonth: "por workspace/mês",
    flatRateForTeam: "Valor fixo para sua equipe ({seats} assentos)",
    perUserPerYear: "por usuário/ano",
    totalOf: "Total de",
    perMonth: "/mês",
    perYear: "/ano",
    months: "meses",
    billedAnnually: "Cobrado anualmente",
    billedMonthly: "Cobrado mensalmente",
    freePlanMaxSeats: "O plano gratuito permite no máximo 5 membros",
    reviewYourPlan: "Revise seu plano",
    myTeamHas: "Minha equipe tem",
    membersLabel: "membros",
    choose: "Escolher",
    continueButton: "Continuar",
    goBack: "Voltar",
    back: "Voltar",
    whatsappLitePickMetaPixel: "Escolha uma integração Meta Pixel",
    whatsappLiteSendToMetaPixel: "Enviar para o Meta Pixel",
    whatsappLiteSendToMetaPixelHint:
      "Reporta novos leads criados automaticamente como eventos de conversão para um Meta Pixel.",
    whatsappLiteNoMetaPixelIntegrations: "Nenhuma integração Meta Pixel encontrada neste projeto.",
    metaPixelIntegration: "Integração Meta Pixel",
    metaPixelDefaultEventName: "Nome do evento padrão",

    // Members
    invitations: "Convites",
    failedInvitations: "Convites falhados",
    addMember: "Adicionar Membro",
    youCannotAddMoreMembers: "Você não pode adicionar mais membros",
    youCanOnlyAddUpTo: "Você só pode adicionar até {limit} membros com o plano {plan}",
    membersWithThe: "membros com o",
    plan: "plano",
    youDontHavePermissionToAddMembers: "Você não tem permissão para adicionar membros",
    user: "Usuário",
    emailAddress: "Endereço de email",
    role: "Função",
    status: "Status",
    active: "Ativo",
    inactive: "Inativo",
    you: "(Você)",
    removeUser: "Remover usuário",
    disable: "Desabilitar",
    thisUserWillBeRemovedFromAllProjects: "este usuário será removido de todos os projetos",

    // Invitations
    workspaceRole: "Função do workspace",
    dateSent: "Data de envio",
    dateUpdated: "Data atualizada",
    noInvitationsFound: "Nenhum convite encontrado",
    noFailedInvitationsFound: "Nenhum convite falhado encontrado",
    invitationSent: "Convite enviado",
    pendingFor: "Pendente há {days} dias",
    acceptedInvitedAt: "Aceito em {date}",
    removedInvitedAt: "Removido em {date}",
    rejectedInvitedAt: "Rejeitado em {date}",
    expiredInvitedAt: "Expirado em {date}",
    canceledInvitedAt: "Cancelado em {date}",
    allStatuses: "Todos os status",
    statusPending: "Pendente",
    statusAccepted: "Aceito",
    statusExpired: "Expirado",
    statusCanceled: "Cancelado",
    statusRejected: "Rejeitado",
    statusRemoved: "Removido",
    cancelInvitation: "Cancelar convite",
    invitationCanceled: "convite cancelado",
    invitationExpired: "convite expirado",
    invitationDeclined: "convite recusado",
    resendInvitation: "Reenviar convite",
    removeFromList: "Remover da lista",
    invitationSentSuccessfully: "convite enviado com sucesso",

    // Roles and permissions
    rolesAndPermissions: "Cargos e permissões",
    search: "Pesquisar...",
    createNewRole: "Criar novo cargo",
    youCanOnlyCreateUpTo: "Você só pode criar até {limit} cargos personalizados no plano {plan}",
    customRolesIn: "cargos personalizados no",
    noRolesFound: "Nenhum cargo encontrado",
    edit: "Editar",
    delete: "Excluir",
    youCanOnlyDeleteCustomRoles: "Você só pode excluir cargos personalizados",
    creatingNewRole: "Criando novo cargo",
    saveChanges: "Salvar alterações?",
    youHaveUnsavedChanges: "Você tem alterações não salvas.",
    discardChanges: "Descartar alterações",
    monthly: "Mensal",
    yearly: "Anual",
    quarterly: "Trimestral",
    semestral: "Semestral",
    billedQuarterly: "Cobrado a cada 3 meses",
    billedSemestrally: "Cobrado a cada 6 meses",
    saveUpToMessage: "Economize até {percentage}%{onYearlyPlan}",
    onYearlyPlan: " no plano anual",
    saveUpTo: "ECONOMIZE ATÉ",
    noMembers: "Nenhum membro encontrado",
    noPlan: "Sem plano",
    upgradeNow: "Atualizar agora",
    startedPlan: "Plano Iniciado",
    trial: "Trial",
    remaining: "restante",
    youreCurrentlyOnTheFreeForeverPlan: "Você está atualmente no plano",
    foreverPlan: "para sempre.",
    free: "Grátis",
    upgradeForMore: "Atualize para mais",
    startYourFreeTrialNow: "Inicie seu trial gratuito agora",
    editingRole: "Editando cargo",
    roleName: "Nome do cargo",
    roleNamePlaceholder: "Nome do cargo",
    workspace: "Workspace",
    projects: "Projetos",
    timeTracker: "Rastreador de Tempo",
    documents: "Biblioteca",
    create: "Criar",
    update: "Atualizar",
    fullPermission: "Permissão completa",
    checkAll: "Marcar todos",
    uncheckAll: "Desmarcar todos",
    rolesUiPeople: "Pessoas",
    rolesUiPeopleCount: "{count} pessoas",
    rolesUiOnePerson: "1 pessoa",
    rolesUiModulesWithAccess: "Módulos com acesso",
    rolesUiPermissions: "Permissões",
    rolesUiAllModules: "Todos os {count} módulos",
    rolesUiNoModules: "Nenhum módulo",
    rolesUiCountOf: "{count} de {total}",
    rolesUiModuleOff: "Módulo desabilitado",
    rolesUiFullArea: "Permissão completa nesta área",
    rolesUiMarkAll: "Marcar todos",
    rolesUiStandard: "Padrão",
    rolesUiCustom: "Personalizado",
    rolesUiLede:
      "Um cargo reúne o que a pessoa pode fazer em cada módulo do workspace. Quem vê cada board é definido nas configurações do projeto.",
    rolesUiSearchPermissions: "Buscar em todas as áreas (ex.: lead, sprint, pasta)",
    rolesUiOnlyActive: "Mostrar só as ativas",
    rolesUiResults: "{count} resultados",
    rolesUiApplyTemplate: "Aplicar modelo",
    rolesUiTemplateApplied: "Modelo {name} aplicado: {count} permissões. Revise antes de salvar.",
    rolesUiTplViewer: "Só visualiza projetos, cards, documentos e tempo.",
    rolesUiTplCommenter: "Visualiza e comenta em cards.",
    rolesUiTplCollaborator: "Trabalha em cards, colunas, CRM, produtos, documentos e tempo.",
    rolesUiTplEditor: "Como Collaborator, mais criar projetos e publicar documentos.",
    rolesUiTplAdmin: "Todas as permissões do workspace.",
    rolesUiNone: "Nenhuma",
    rolesUiReadOnly: "Só visualizar",
    rolesUiAll: "Todas",
    rolesUiActiveOfTotal: "{active} de {total} ativas",
    rolesUiRequires: "Requer “{label}”",
    rolesUiAlsoDisabled: "Também desliguei {count} permissões que dependem de “{label}”.",
    rolesUiAlsoEnabled: "Liguei também “{label}”, necessária para esta ação.",
    rolesUiModuleGate:
      "Este cargo não tem “{label}” (Workspace › Módulos). As permissões abaixo só valem quando esse acesso estiver ligado.",
    rolesUiTurnOnAccess: "Ligar acesso",
    rolesUiUnsaved: "{count} alterações não salvas",
    rolesUiAllSaved: "Tudo salvo",
    rolesUiActiveCount: "{active} de {total} permissões ativas",
    rolesUiNoMatch: "Nenhuma permissão encontrada para “{query}”.",
    rolesUiNoActive: "Nenhuma permissão ativa nesta área.",
    rolesUiVerbRead: "Ver",
    rolesUiVerbCreate: "Criar",
    rolesUiVerbUpdate: "Editar",
    rolesUiVerbDelete: "Excluir",
    rolesUiVerbAction: "Ação",
    rolesUiAreas: "Áreas de permissão",
    roleUpdatedSuccessfully: "Cargo atualizado com sucesso",
    loading: "Carregando...",
    deleteRoleDialogTitle: 'Excluir cargo "{roleName}"',
    deleteRoleDialogConfirmQuestion: 'Excluir o cargo "{roleName}"?',
    deleteRoleDialogMustReassign:
      'Todos os membros devem ser reatribuídos a um novo cargo antes de excluir "{roleName}".',
    deleteRoleDialogAssignedToMemberCount: "Este cargo está atribuído a {count} membros.",
    deleteRoleDialogMembersHeading: "Membros",
    deleteRoleDialogChangeAllToLabel: "Alterar todos para:",
    deleteRoleDialogSelectNewRole: "Selecionar novo cargo",
    deleteRoleDialogDeleting: "Excluindo...",
    deleteRoleDialogDeleteRoleButton: "Excluir cargo",
    deleteRoleDialogReassignFailed: "Não foi possível excluir o cargo. Tente novamente.",
    deleteRoleDialogDeleteSuccessWithReassignment: 'O cargo "{roleName}" foi excluído e os membros foram reatribuídos.',
    deleteRoleDialogDeleteSuccessNoMembers: 'O cargo "{roleName}" foi excluído.',
    createNewWorkspace: "Criar um novo workspace",
    noWorkspacesFound: "Nenhum workspace encontrado.",
    clientWorkspacesSectionTitle: "Workspaces de clientes",
    clientWorkspaceEnterError: "Não foi possível abrir esse workspace. Tente novamente.",
    createWorkspaceDescription: "O espaço onde sua equipe colabora, compartilha e realiza o trabalho.",
    addImage: "Adicionar imagem",
    changeImage: "Alterar imagem",
    language: "Idioma",
    selectLanguage: "Selecionar idioma",
    createWorkspace: "Criar workspace",
    workspaceSettings: "Configurações do workspace",
    private: "Privado",
    cardExpiryExpired: "Data de validade do cartão expirou",
    cardExpiryInvalid: "Por favor, insira uma data de validade válida (MM/AA)",
    paymentDetails: "Detalhes do pagamento",
    addNewCard: "Adicionar um novo cartão",
    cardInformation: "Informações do cartão",
    cardholderName: "Nome do portador do cartão",
    cardNumberPlaceholder: "1234 1234 1234 1234",
    cardExpiryPlaceholder: "MM/AA",
    cardCvcPlaceholder: "CVC",
    cardholderNamePlaceholder: "Nome completo no cartão",
    cardNumberInvalid: "Por favor, insira um número de cartão válido",
    cardCvcInvalid: "Por favor, insira um CVC válido",
    cardholderNameRequired: "Por favor, insira o nome do portador do cartão",
    failedToCreatePaymentMethod: "Falha ao criar método de pagamento",
    failedToCreateWorkspace: "Falha ao criar workspace",
    workspaceCreationSuccess: "Tudo pronto! Sua assinatura está ativa",
    failedToCreatePaymentMethodOrWorkspace:
      "Falha ao criar método de pagamento ou workspace. Por favor, tente novamente.",
    endedIn: "Termina em",
    expiration: "Validade",
    noSavedPaymentMethods: "Nenhum método de pagamento salvo. Adicione um cartão para continuar.",
    deletePaymentMethod: "Excluir método de pagamento",
    setDefaultPaymentMethod: "Definir como padrão",
    defaultPaymentMethodBadge: "Padrão",
    saveCard: "Salvar cartão",
    billingPaymentMethods: "Métodos de pagamento",
    billingInvoices: "Faturas",
    billingCardsLoadError: "Não foi possível carregar os métodos de pagamento.",
    billingInvoicesLoadError: "Não foi possível carregar as faturas.",
    setDefaultPaymentMethodSuccess: "Método de pagamento padrão atualizado.",
    deletePaymentMethodSuccess: "Método de pagamento removido.",
    addPaymentMethodSuccess: "Cartão salvo.",
    cannotDeleteOnlyPaymentMethod: "Adicione outro cartão antes de remover o último cadastrado.",
    noInvoices: "Nenhuma fatura ainda.",
    viewInvoice: "Ver",
    downloadInvoice: "PDF",
    billingInvoiceNumber: "Fatura",
    billingInvoiceDate: "Data",
    billingInvoiceAmount: "Valor",
    billingInvoiceStatus: "Status",
    billingInvoiceActions: "Ações",
    billingViewMore: "Ver mais",
    billingViewLess: "Ver menos",
    cardExpiresOn: "Expira {month}/{year}",
    cardExpiredOn: "Expirado {month}/{year}",
    invoiceStatusPaid: "Paga",
    invoiceStatusOpen: "Aberta",
    invoiceStatusDraft: "Rascunho",
    invoiceStatusVoid: "Anulada",
    invoiceStatusUncollectible: "Não cobrável",
    invoiceUntitled: "Fatura",
    deletePaymentMethodConfirm: "Remover o cartão com final {last4}?",
    currentSubscription: "Assinatura atual",
    currentSubscriptionCustomHint: "Este preço não está mais no catálogo público. Você ainda pode gerenciá-lo aqui.",
    choosePaymentMethod: "Escolha um método de pagamento para continuar.",
    cardDeclinedFraudulent:
      "Seu cartão foi recusado por motivos de segurança. Por favor, use um método de pagamento diferente.",
    cardDeclinedInsufficientFunds:
      "Seu cartão não possui fundos suficientes. Por favor, verifique o saldo da sua conta ou use um método de pagamento diferente.",
    cardDeclinedExpired:
      "Seu cartão expirou. Por favor, verifique a data de validade ou use um método de pagamento diferente.",
    cardDeclinedLost: "Seu cartão foi relatado como perdido. Por favor, use um método de pagamento diferente.",
    cardDeclinedStolen: "Seu cartão foi relatado como roubado. Por favor, use um método de pagamento diferente.",
    cardDeclinedGeneric:
      "Seu cartão foi recusado. Por favor, verifique os detalhes do seu cartão ou use um método de pagamento diferente.",
    paymentFormNotReady: "O formulário de pagamento não está pronto. Por favor, aguarde um momento.",
    checkPaymentDetails: "Por favor, verifique os detalhes do pagamento",
    stripeKeyMissing: "Configuração de pagamento ausente. Por favor, entre em contato com o suporte.",
    failedToCreateSetupIntent: "Falha ao inicializar o pagamento. Por favor, tente novamente.",
    failedToInitializePaymentForm: "Falha ao inicializar o formulário de pagamento. Por favor, tente novamente.",
    paymentSetupError: "Erro na Configuração do Pagamento",
    // Review bill / onboarding
    reviewYourBill: "Confirmação de plano",
    subtotal: "Subtotal",
    subtotalWithSeats: "Subtotal ({seats} assentos)",
    addPromotionCode: "Adicionar código promocional",
    promotionCode: "Código promocional",
    promotionCodePlaceholder: "Digite seu código",
    apply: "Aplicar",
    discount: "Desconto",
    removePromotionCode: "Remover código promocional",
    total: "Total",
    // Promotion code validation
    promotionCodeRequired: "O código promocional é obrigatório",
    failedToValidatePromotionCode: "Falha ao validar o código promocional",
    promotionCodeNotFoundOrInactive: "Código promocional não encontrado ou inativo",
    promotionCodeNotValidForAccount: "Este código promocional não é válido para sua conta",
    promotionCodeSignInRequired: "Este código promocional é restrito a um cliente específico. Por favor, faça login.",
    promotionCodeExpired: "O código promocional não é mais válido (expirado ou limite de resgates atingido)",
    promotionCodeWrongPlan: "Este código promocional não se aplica ao plano selecionado",
    promotionCodeWrongCurrency: "Este código promocional se aplica apenas a USD, não BRL",
    promotionCodeNoPricingForCurrency: "Este plano não tem preços para esta moeda",
    promotionCodeFirstWorkspaceOnly: "Este código promocional é válido apenas para seu primeiro workspace",
    promotionCodeFirstTimeSignInRequired:
      "Este código promocional é para criadores de workspace pela primeira vez. Por favor, faça login.",
    // Promotion code success messages
    discountSuccessRepeatingPercent: "{percent}% de desconto aplicado nas próximas {months} faturas.",
    discountSuccessRepeatingAmount: "{amount} de desconto aplicado nas próximas {months} faturas.",
    discountSuccessOncePercent: "{percent}% de desconto aplicado na primeira fatura.",
    discountSuccessOnceAmount: "{amount} de desconto aplicado na primeira fatura.",
    discountSuccessForeverPercent: "{percent}% de desconto recorrente aplicado em todas as faturas.",
    discountSuccessForeverAmount: "{amount} de desconto recorrente aplicado em todas as faturas.",
    // Auth pages
    welcomeBack: "Bem-vindo de volta!",
    email: "E-mail",
    password: "Senha",
    confirmPassword: "Confirmar senha",
    passwordsDoNotMatch: "As senhas não coincidem",
    forgotPassword: "Esqueceu sua senha?",
    signIn: "Entrar",
    or: "OU",
    continueWithGoogle: "Continuar com o Google",
    dontHaveAccount: "Ainda não tem uma conta?",
    signUp: "Cadastre-se",
    emailOrPasswordInvalid: "E-mail ou senha inválidos.",
    somethingWentWrongTryAgain: "Algo deu errado, por favor tente novamente.",
    // Sign up page
    createAccountInSeconds: "Crie uma conta em segundos!",
    secureYourAccount: "Proteja sua conta com uma senha.",
    fullName: "Nome completo",
    next: "Próximo",
    alreadyHaveAccount: "Já tem uma conta?",
    byClickingButton: "Ao clicar no botão acima, você concorda com nossos",
    iAgreeToThe: "Eu concordo com os",
    termsOfService: "Termos de Serviço",
    and: "e",
    privacyPolicy: "Política de Privacidade.",
    enterValidEmail: "Por favor, insira um e-mail válido.",
    emailAlreadyRegistered: "Este e-mail já está registrado. Tente fazer login ou use um e-mail diferente.",
    // Onboarding page metadata
    onboardingPageTitle: "JSYNQ - Onboarding",
    onboardingPageDescription: "Crie seu workspace selecionando um plano e configurando sua equipe.",
    onboardingPlanPageTitle: "JSYNQ - Escolha um plano",
    onboardingPlanPageDescription: "Selecione um plano antes de criar seu workspace.",
    onboardingReviewPageTitle: "JSYNQ - Confirmação de plano",
    onboardingReviewPageDescription: "Revise seu plano e aplique um código promocional antes do pagamento.",
    onboardingPaymentPageTitle: "JSYNQ - Detalhes do pagamento",
    onboardingPaymentPageDescription: "Selecione um método de pagamento para concluir a configuração do seu workspace.",
    onboardingPaymentDetailsPageTitle: "JSYNQ - Detalhes do pagamento",
    onboardingPaymentDetailsPageDescription:
      "Insira seus dados de pagamento para concluir a configuração do seu workspace.",
    onboardingInviteMembersPageTitle: "JSYNQ - Convidar membros",
    onboardingInviteMembersPageDescription: "Convide membros da equipe para colaborar no seu workspace.",

    integrationPageSubtitle:
      "Conecte e gerencie integrações do workspace para estender funcionalidades e automatizar fluxos de trabalho.",
    integrationAddTelegram: "Adicionar integração Telegram",
    integrationLoading: "Carregando integrações...",
    integrationConnectedTitle: "Integrações conectadas",
    integrationActive: "Ativo",
    integrationInactive: "Inativo",
    integrationUpdated: "Atualizado",
    integrationOpen: "Abrir",
    integrationConfigure: "Configurar",
    integrationGenerateLinkCode: "Gerar código de vínculo",
    integrationEmptyTitle: "Ainda não há integrações",
    integrationEmptyBody: "Adicione sua primeira integração para começar.",
    integrationDiscoverTitle: "Descobrir integrações",
    integrationTelegramCardTitle: "Telegram",
    integrationTelegramCardDescription:
      "Conecte o Telegram no workspace para permitir consultas seguras do assistente somente leitura para usuários vinculados.",
    clickupWsCardTitle: "ClickUp",
    clickupWsCardDescription:
      "Importe várias listas do ClickUp de uma vez. Cada lista vira um projeto novo no JSYNQ com status, tarefas, comentários, anexos e Docs na Library.",
    clickupWsBtnManage: "Gerenciar importação",
    clickupWsConnectedStatus: "Status da importação: {status}",
    clickupWsConnectedSubtitle: "Importação em massa de listas",
    clickupWsImportStartedToast:
      "Importação iniciada para {count} lista(s). Pode fechar a página — continua em segundo plano.",
    clickupWsStatus_processing: "Importação em andamento",
    clickupWsStatus_queued: "Importação na fila",
    clickupWsStatus_completed: "Importação concluída",
    clickupWsStatus_failed: "Importação falhou",
    clickupWsStatus_idle: "Pronto para importar",
    clickupWsModalTitle: "Importação ClickUp no workspace",
    clickupWsModalIntro:
      "Conecte o ClickUp, escolha o time e o space, e selecione listas ou pastas. Cada lista selecionada vira um projeto neste workspace.",
    clickupWsAuthentication: "Autenticação",
    clickupWsAuthenticate: "Autenticar com ClickUp",
    clickupWsReauth: "Reautenticar com ClickUp",
    clickupWsReauthHint: "Reautentique para navegar no ClickUp e importar mais listas.",
    clickupWsReauthOptional: "Reautentique só se a conexão expirou ou quiser usar outra conta ClickUp.",
    clickupWsAuthenticating: "Autenticando...",
    clickupWsAuthenticated: "ClickUp autenticado",
    clickupWsSelectTeam: "Time ClickUp (Workspace)",
    clickupWsChooseTeam: "Escolha um time",
    clickupWsLoadingTeams: "Carregando times...",
    clickupWsSelectSpace: "Space",
    clickupWsChooseSpace: "Escolha um space",
    clickupWsLoadingSpaces: "Carregando spaces...",
    clickupWsSelectLists: "Listas e pastas",
    clickupWsSelectAll: "Selecionar tudo no space",
    clickupWsLoadingLists: "Carregando listas...",
    clickupWsNoLists: "Nenhuma lista encontrada neste space.",
    clickupWsSelectedCount: "{count} lista(s) selecionada(s)",
    clickupWsImportButton: "Importar {count} lista(s) como projetos",
    clickupWsImporting: "Importando...",
    clickupWsResults: "Resultados da importação",
    clickupWsDisconnect: "Desconectar ClickUp",
    clickupWsAuthFailed: "Falha na autenticação do ClickUp",
    clickupWsConnectFailed: "Falha ao salvar conexão ClickUp",
    clickupWsConnectedToast: "ClickUp conectado ao workspace",
    clickupWsImportFailed: "Falha na importação do ClickUp",
    clickupWsImportSuccess: "{count} lista(s) do ClickUp importada(s) como projetos",
    clickupWsImportPartial: "Importadas {ok} lista(s); {failed} falharam",
    clickupWsDisconnectFailed: "Falha ao desconectar ClickUp",
    clickupWsDisconnectedToast: "ClickUp desconectado",
    clickupWsFailedTeams: "Falha ao carregar times do ClickUp",
    clickupWsFailedSpaces: "Falha ao carregar spaces do ClickUp",
    clickupWsFailedFolders: "Falha ao carregar pastas do ClickUp",
    clickupWsFailedLists: "Falha ao carregar listas do ClickUp",
    rdStationWsCardTitle: "RD Station CRM",
    rdStationWsCardDescription:
      "Conecte o RD Station CRM para manter as negociações sincronizadas nos dois sentidos: um projeto dedicado é criado com uma coluna por estágio do pipeline, e mudanças em qualquer um dos sistemas atualizam o outro automaticamente.",
    rdStationWsConnectButton: "Conectar RD Station",
    rdStationWsConnecting: "Conectando",
    rdStationWsConnected: "Conectado",
    rdStationWsAttention: "Atenção",
    rdStationWsAuthenticating: "Autenticando...",
    rdStationWsAuthFailed: "Falha na autenticação do RD Station",
    rdStationWsConnectFailed: "Falha ao conectar o RD Station",
    rdStationWsSettingUp: "Configurando seu projeto de CRM e as colunas do pipeline...",
    rdStationWsConnectedToast: "RD Station conectado — seu projeto de CRM está pronto",
    rdStationWsViewProject: "Ver projeto de CRM",
    rdStationWsReconnect: "Reconectar",
    rdStationWsReconcile: "Atualizar leads do RD Station",
    rdStationWsReconciling: "Enfileirando…",
    rdStationWsReconcileQueued: "Atualização enfileirada. Os cards que já existem serão atualizados, sem duplicar.",
    rdStationWsReconcileFailed: "Não foi possível enfileirar a atualização dos leads",
    rdStationWsDisconnect: "Desconectar RD Station",
    rdStationWsDisconnecting: "Desconectando…",
    rdStationWsDisconnectFailed: "Falha ao desconectar o RD Station",
    rdStationWsDisconnectedToast: "RD Station desconectado",
    rdStationWsDisconnectTitle: "Desconectar RD Station",
    rdStationWsDisconnectDescription:
      "Isso interrompe a sincronização entre o JSYNQ e o RD Station CRM. O projeto de CRM e os cards continuam no JSYNQ, mas deixam de atualizar o RD Station ou receber atualizações dele.",
    rdStationWsAlreadyConnectedError: "Este workspace já tem uma conexão RD Station ativa. Desconecte-a primeiro.",
    rdStationWsSelectPipelinesTitle: "Selecione os funis para importar",
    rdStationWsSelectPipelinesDescription:
      "Escolha quais funis do RD Station trazer para o JSYNQ. Cada um vira um projeto dedicado.",
    rdStationWsNoPipelinesFound: "Nenhum funil foi encontrado na sua conta do RD Station.",
    rdStationWsPipelineStages: "{count} etapas",
    rdStationWsImportButton: "Importar selecionados",
    rdStationWsImporting: "Configurando seus projetos de CRM...",
    rdStationWsImportFailed: "Falha ao importar os funis selecionados",
    rdStationWsSelectAtLeastOne: "Selecione pelo menos um funil",
    rdStationWsCancelSelectionConfirmTitle: "Cancelar a conexão com o RD Station?",
    rdStationWsCancelSelectionConfirmDescription:
      "Você autenticou com o RD Station mas ainda não escolheu nenhum funil. Fechar agora cancela a conexão — será preciso autenticar novamente para tentar de novo.",
    kommoWsCardTitle: "Kommo CRM",
    kommoWsCardDescription:
      "Importe os funis do Kommo para um único projeto de CRM. Cada pipeline vira uma aba, e empresas, contatos e leads entram a partir do Kommo.",
    kommoWsConnectButton: "Conectar Kommo",
    kommoWsConnecting: "Conectando…",
    kommoWsConnected: "Conectado",
    kommoWsAttention: "Atenção",
    kommoWsConnectFailed: "Falha ao conectar o Kommo",
    kommoWsConnectedToast: "Kommo conectado — o projeto de CRM está pronto",
    kommoWsImportingToast: "Kommo conectado — importando funis e leads…",
    kommoWsReimportedToast: "Dados do Kommo foram reimportados",
    kommoWsViewProject: "Ver projeto de CRM",
    kommoWsReconnect: "Reconectar",
    kommoWsRetryImport: "Tentar importar de novo",
    kommoWsReimport: "Reimportar",
    kommoWsImporting: "Importando do Kommo…",
    kommoWsImportFailed: "Falha ao importar a conta Kommo",
    kommoWsDisconnect: "Desconectar Kommo",
    kommoWsDisconnecting: "Desconectando…",
    kommoWsDisconnectFailed: "Falha ao desconectar o Kommo",
    kommoWsDisconnectedToast: "Kommo desconectado",
    kommoWsDisconnectTitle: "Desconectar Kommo",
    kommoWsDisconnectDescription:
      "Isso interrompe as atualizações do Kommo. O projeto de CRM, empresas, contatos e cards ficam no JSYNQ.",
    kommoWsSubdomainLabel: "Subdomínio",
    kommoWsSubdomainPlaceholder: "acme",
    kommoWsSubdomainHint: "O “conta” em conta.kommo.com — você pode colar a URL completa.",
    kommoWsTokenLabel: "Token de acesso de longa duração",
    kommoWsTokenPlaceholder: "Cole o token da integração privada no Kommo",
    kommoWsFieldsRequired: "Preencha o subdomínio e o token de acesso.",
    kommoWsPipelineCount: "{count} funis",
    kommoWsModalTitle: "Kommo CRM",
    kommoWsModalIntro: "Conecte a conta Kommo com o subdomínio e um token de longa duração da integração privada.",
    googleWsCardDescription:
      "Conecte Gmail e Google Calendar para que seu agente possa ler emails, criar rascunhos e gerenciar eventos de calendário.",
    googleWsConnectButton: "Conectar Google",
    googleWsRedirecting: "Redirecionando…",
    googleWsConnected: "Conectado",
    googleWsAttention: "Atenção",
    googleWsToolsCount: "{count} ferramentas",
    googleWsTestConnection: "Testar conexão",
    googleWsReconnect: "Reconectar",
    googleWsDisconnect: "Desconectar",
    googleWsDisconnectTitle: "Desconectar Google",
    googleWsDisconnectDescription:
      "Isso removerá o acesso do agente ao Gmail e Google Calendar. Você poderá reconectar a qualquer momento.",
    googleWsDisconnecting: "Desconectando…",
    googleWsSessionExpired: "Sessão expirada. Faça login novamente.",
    googleWsDisconnectFailed: "Erro ao desconectar uma ou mais conexões Google.",
    googleWsDisconnectedToast: "Google desconectado com sucesso.",
    googleWsDisconnectUnexpectedError: "Erro inesperado ao desconectar Google.",
    googleWsTestHealthy: "Conexão saudável!",
    googleWsTestFailed: "Teste de conexão falhou.",
    googleWsTestUnexpectedError: "Erro inesperado ao testar conexão.",
    googleWsStatusHealthy: "Conectado",
    googleWsStatusDegraded: "Degradado",
    googleWsStatusUnhealthy: "Erro",
    googleWsStatusUnknown: "Desconhecido",
    googleWsOAuthSuccessToast: "Google conectado! Gmail e Calendar disponíveis.",
    googleWsOAuthUnknownError: "Erro desconhecido",
    googleWsOAuthAccessDenied: "Você cancelou a autorização. Clique novamente para conectar.",
    googleWsOAuthNotConfigured: "Integração Google não configurada. Contate o administrador.",
    googleWsOAuthFailed: "Falha ao conectar Google: {error}",
    integrationBtnConnect: "Conectar",
    integrationBtnConnected: "Conectado",
    integrationModalPickFirst: "Selecione uma integração para configurar.",
    integrationModalHint:
      "Assistente Telegram deste workspace · Cada pessoa vincula a própria conta com um código de uso único.",
    integrationTabOverview: "Resumo",
    integrationTabSetup: "Conexão",
    integrationTabLinkUsers: "Vincular contas",
    integrationTabHelp: "Ajuda",
    integrationOverviewIntro:
      "Use Conexão para adicionar ou alterar o bot. Use Vincular contas para as pessoas conectarem o Telegram ao workspace.",
    integrationOverviewBotLanguage: "Idioma do bot",
    integrationOverviewNotSet: "Ainda não definido",
    integrationOverviewLastUpdated: "Última atualização",
    integrationOverviewCreated: "Criado em",
    integrationOverviewWebhookTitle: "Endereço do webhook",
    integrationOverviewCopyWebhook: "Copiar URL do webhook",
    integrationOverviewWebhookHelp: "Útil se a TI validar a integração. O dia a dia fica na aba Conexão.",
    integrationOverviewSecretsNote:
      "Tokens salvos não aparecem no app — use Conexão e informe de novo ao alterar a integração.",
    integrationSetupIntro:
      "Conecte o bot do Telegram e defina como o assistente acessa os dados do workspace. Segredos salvos não são exibidos de novo — cole valores novos ao atualizar.",
    integrationSetupBotFatherTitle: "Onde consigo o token do bot?",
    integrationSetupBotFatherStep1: "Abra o Telegram e converse com @BotFather.",
    integrationSetupBotFatherStep2: "Envie /newbot e siga os passos.",
    integrationSetupBotFatherStep3: "Copie o token (formato 123456:AA…) no campo abaixo.",
    integrationSetupBotTokenLabel: "Token do BotFather",
    integrationSetupBotTokenPlaceholder: "Cole o token aqui",
    integrationSetupLanguageLabel: "Idioma do assistente (opcional)",
    integrationSetupLanguagePlaceholder: "ex.: en, pt-BR",
    integrationSetupAutoTokenTitle: "Criar um token de API para este bot automaticamente",
    integrationSetupAutoTokenDesc:
      "Escolha as permissões abaixo e confirme. Criamos o token em segundo plano e enviamos ao salvar. Desmarque para colar um token existente.",
    integrationSetupScopesAccordion: "O que o assistente pode acessar",
    integrationSetupConfirmToken: "Confirmar permissões e criar acesso",
    integrationSetupConfirmTokenWorking: "Criando acesso…",
    integrationSetupManualTokenLabel: "Seu token de API",
    integrationSetupManualHelp: "Crie um em Configurações → Membros no seu perfil e cole aqui.",
    integrationSetupWebhookAdvanced: "URL do webhook (avançado)",
    integrationSetupCopy: "Copiar",
    integrationSetupSaving: "Salvando…",
    integrationSetupSave: "Salvar conexão",
    integrationSetupNoPermission: "Você precisa de permissão para gerenciar integrações do workspace.",
    integrationLinkSavedTitle: "Conexão salva",
    integrationLinkSavedBody: "Gere um código abaixo e envie ao bot para as pessoas vincularem o Telegram.",
    integrationLinkTitle: "Vincular uma conta Telegram",
    integrationLinkBody: "Vamos mostrar um código curto. No Telegram, abra o bot do workspace e envie:",
    integrationLinkGetCode: "Obter novo código",
    integrationLinkCreatingCode: "Criando código…",
    integrationLinkYourCode: "Seu código",
    integrationLinkCopy: "Copiar",
    integrationLinkExpired: "Expirado — gere outro",
    integrationLinkValidFor: "Válido por",
    integrationTroubleshootIntro: "Se algo não funcionar, verifique:",
    integrationTroubleshoot1Title: "O Telegram não alcança seu servidor",
    integrationTroubleshoot1Body:
      "O app precisa estar em HTTPS público. Confira na aba Resumo se a URL do webhook bate com o backend.",
    integrationTroubleshoot2Title: "O bot diz que você não está vinculado",
    integrationTroubleshoot2Body:
      "Gere um código novo em Vincular contas, envie pela mesma conta Telegram e use antes de expirar.",
    integrationTroubleshoot3Title: "Respostas vazias ou muito limitadas",
    integrationTroubleshoot3Body:
      "Em Conexão, confira se há permissões suficientes (ou token que leia projetos e tarefas). O usuário precisa ter acesso no workspace.",
    integrationCreateModalTitle: "Adicionar integração Telegram",
    integrationCreateNameLabel: "Nome",
    integrationCreateNamePlaceholder: "Assistente Telegram do workspace",
    integrationCreateDescLabel: "Descrição (opcional)",
    integrationCreateDescPlaceholder: "Assistente somente leitura para usuários do workspace",
    integrationCreateButton: "Criar integração",
    integrationCreateCreating: "Criando...",
    integrationCountdownExpired: "Expirado",
    integrationToastNameRequired: "O nome é obrigatório",
    integrationToastCreated: "Integração Telegram criada",
    integrationToastContinueSetup: "Integração criada. Continue a configuração do Telegram.",
    integrationToastBotTokenRequired: "O token do bot é obrigatório",
    integrationToastNeedGeneratedToken:
      "Confirme as permissões primeiro para criar o token de API (ou cole um se desativou a criação automática).",
    integrationToastPasteToken: "Cole seu token de API antes de salvar.",
    integrationToastScopesAndToken: "Escolha ao menos uma permissão e confirme para criar o token de API.",
    integrationToastSetupSaved: "Configuração do Telegram salva",
    integrationToastLinkCodeOk: "Código de vínculo gerado",
    integrationToastCodeCopied: "Código copiado",
    integrationToastWebhookCopied: "URL do webhook copiada",
    integrationToastPermissionsChanged: "Permissões alteradas — confirme de novo para criar um novo token de API.",
    integrationToastSignInForToken: "Entre na conta para criar o token de API.",
    integrationToastPickScopes: "Escolha ao menos uma permissão primeiro.",
    integrationToastTokenFail: "Não foi possível criar o token de API",
    integrationToastTokenCreatedAgain:
      "Acesso criado — clique em Salvar conexão quando estiver pronto. Seus outros tokens permanecem ativos.",
    integrationToastTokenCreated:
      "Acesso criado — clique em Salvar conexão quando o restante do formulário estiver pronto.",
    integrationDefaultName: "Assistente Telegram do workspace",
    integrationDefaultDescription: "Assistente somente leitura para usuários do workspace",
    errorUserNotAuthenticated: "Usuário não autenticado",
    errorLabelLength: "O rótulo deve ter no máximo 80 caracteres",
    errorCouldNotLoadTokens: "Não foi possível carregar os tokens de API",
    errorCouldNotRevokeToken: "Não foi possível revogar o token",
    errorFailedToCreateToken: "Falha ao criar token",
    errorTokenNotAvailable: "A cópia só está disponível logo após criar um token",
    errorFailedToCopy: "Falha ao copiar token",
    integrationDelete: "Excluir",
    integrationDeleting: "Excluindo...",
    integrationDeleteConfirm: "Tem certeza que deseja excluir esta integração? Esta ação não pode ser desfeita.",
    integrationDeleteSuccess: "Integração excluída com sucesso",
    integrationDeleteError: "Falha ao excluir integração",
    integrationEnable: "Ativar",
    integrationDisable: "Desativar",
    integrationEnabling: "Ativando...",
    integrationDisabling: "Desativando...",
    integrationStatusUpdated: "Status da integração atualizado",
    integrationStatusUpdateError: "Falha ao atualizar status da integração",
    integrationDisconnect: "Desconectar",
    integrationWebhookUrl: "URL do Webhook",
    // API Token Scopes
    apiTokenScopesTitle: "Escopos do token",
    apiTokenPermissionsSelected: (count: number) =>
      `${count} ${count === 1 ? "permissão" : "permissões"} selecionada${
        count === 1 ? "" : "s"
      } · expanda cada área abaixo`,
    apiTokenScopesSelected: (count: number) => `${count} selecionado${count === 1 ? "" : "s"} · expanda cada categoria`,
    apiTokenPresetAssistant: "Mínimo do assistente",
    apiTokenPresetReadAll: "Todos os escopos de leitura",
    apiTokenPresetClear: "Limpar",
    apiTokenPresetSelectAll: "Selecionar todos os escopos (acesso total nesta lista)",
    apiTokenScopesHelperEmbedded:
      "Apenas os itens marcados são permitidos para este bot. Ajuste conforme o quanto você deseja que o assistente veja.",
    apiTokenScopesHelperDefault:
      "Apenas as permissões marcadas são incluídas. IDs de escopo desconhecidos são rejeitados pelo servidor.",
    // Scope group categories
    scopeCategoryWorkspaces: "Workspaces",
    scopeCategoryProjects: "Projetos",
    scopeCategoryCards: "Cards",
    scopeCategoryDocuments: "Documentos",
    scopeCategoryMeetings: "Reuniões e transcrições",
    scopeCategoryDashboard: "Dashboard e tempo",
    // Scope labels
    scopeWorkspacesRead: "Workspaces (leitura)",
    scopeWorkspacesWrite: "Workspaces (escrita)",
    scopeProjectsRead: "Projetos (leitura)",
    scopeProjectsWrite: "Projetos (escrita)",
    scopeCardsRead: "Cards (leitura)",
    scopeCardsWrite: "Cards (escrita)",
    scopeDocumentsRead: "Documentos (leitura)",
    scopeDocumentsWrite: "Documentos (escrita)",
    scopeMeetingsRead: "Reuniões (leitura)",
    scopeTranscriptsRead: "Transcrições (leitura)",
    scopeDashboardRead: "Dashboard (leitura)",
    scopeTimeTrackerRead: "Registro de tempo (leitura)",
    scopeTimeTrackerWrite: "Registro de tempo (escrita)",
    // Scope descriptions
    scopeDescWorkspacesRead: "Ler dados do workspace",
    scopeDescWorkspacesWrite: "Criar ou atualizar recursos do workspace",
    scopeDescProjectsRead: "Listar projetos e ler metadados",
    scopeDescProjectsWrite: "Criar ou atualizar projetos",
    scopeDescCardsRead: "Ler cards e dados de tarefas",
    scopeDescCardsWrite: "Criar ou atualizar cards",
    scopeDescDocumentsRead: "Ler documentos",
    scopeDescDocumentsWrite: "Criar ou atualizar documentos",
    scopeDescMeetingsRead: "Ler dados de reuniões",
    scopeDescTranscriptsRead: "Ler transcrições",
    scopeDescDashboardRead: "Ler dados do dashboard",
    scopeDescTimeTrackerRead: "Ler registros de tempo",
    scopeDescTimeTrackerWrite: "Criar ou atualizar registros de tempo",
    integrationSetupPostSaveMessage: "Pronto — seu bot está vinculado com o token de API que você salvou.",
    integrationLinkInstructionsFallback: "Envie o código ao bot no Telegram com /link.",
    integrationLinkKbdExample: "/link SEU_CÓDIGO",
    integrationApiTokenLabel: "Assistente Telegram",
    // Wizard steps
    integrationWizardStep1Label: "Configuração do Bot",
    integrationWizardStep2Label: "Token de API",
    integrationWizardStep3Label: "Revisar e Conectar",
    integrationWizardContinue: "Continuar",
    integrationWizardBack: "Voltar",
    integrationWizardReviewTitle: "Revise sua configuração antes de conectar:",
    integrationWizardBotConfigLabel: "Token do Bot",
    integrationWizardLanguageConfigLabel: "Idioma",
    integrationWizardTokenMethodLabel: "Método do Token",
    integrationWizardTokenMethodAuto: "Gerado automaticamente",
    integrationWizardTokenMethodManual: "Entrada manual",
    integrationWizardScopesLabel: "Permissões",
    integrationWizardScopesCount: "{count} permissões selecionadas",
    integrationWizardTokenConfigured: "Token do bot já está configurado",
    integrationWizardTokenReplace: "Substituir token",
    integrationWizardScopeRequired: "Selecione pelo menos uma permissão",
    integrationWizardApiTokenRequired: "Token de API é obrigatório",
    integrationWizardBotTokenRequired: "Token do bot é obrigatório",

    // MCP Connections
    addConnection: "Adicionar Conexão",
    testConnection: "Testar Conexão",
    connectionHealthy: "Saudável",
    connectionDegraded: "Degradada",
    connectionUnhealthy: "Não Saudável",
    connectionUnknown: "Desconhecido",

    // Agents
    agents: "Agentes",
    createAgent: "Criar Agente",
    agentTypeSpecialized: "Especializado",
    agentTypeOrchestrator: "Orquestrador",
    systemPrompt: "Prompt do Sistema",
    availableTools: "Ferramentas Disponíveis",
    modelConfig: "Configuração do Modelo",
    temperature: "Temperatura",
    maxSteps: "Passos Máximos",

    // Workflows
    workflows: "Fluxos de Trabalho",
    createWorkflow: "Criar Fluxo de Trabalho",
    stepName: "Nome do Passo",
    variableMapping: "Mapeamento de Variáveis",

    // Chat
    selectAgent: "Selecionar Agente",
    sendMessage: "Enviar Mensagem",
    confirmationRequired: "Confirmação Necessária",
    approve: "Aprovar",
    reject: "Rejeitar",
    automationsHubNav: "Automações",
  },

  spanish: {
    // Form fields
    workspaceName: "Nombre del workspace",
    companyName: "Nombre de la empresa",
    companyWebsite: "Sitio web de la empresa",
    domain: "Dominio",
    workspaceNamespace: "Namespace del workspace",
    workspaceNamespaceHint: "Único en JSYNQ. La URL del workspace será {url}.",
    workspaceNamespacePlaceholder: "tu-workspace",
    workspaceNamespaceInvalid: "Usa letras minúsculas, números y guiones. No uses --.",
    workspaceNamespaceReserved: "Ese namespace está reservado.",
    workspaceNamespaceTaken: "Ese namespace ya está en uso.",
    workspaceOwner: "Propietario del workspace",
    description: "Descripción",

    // Buttons
    cancel: "Cancelar",
    save: "Guardar",
    copy: "Copiar",

    // WhatsApp Lite (workspace)
    whatsappLiteNav: "WhatsApp",
    messagesSettingsNav: "Mensajes",
    smsLiteNav: "SMS",
    voiceCallsSettingsNav: "Llamadas de voz",
    smsLiteTitle: "Números SMS",
    smsLiteSubtitle: "Conecta números SMS, configura agentes IA, automatización de CRM y automatizaciones inbound.",
    smsLiteSessions: "Números SMS",
    smsLiteTabSessionsDesc: "Conecta y gestiona los números SMS (Twilio) de este workspace.",
    smsLiteAutomation: "Agentes",
    smsLiteTabAutomationDesc: "Agente IA por número, creación automática de negociaciones y seguimientos.",
    smsLiteRuleTemplates: "Automatizaciones",
    smsLiteTabFlowsDesc:
      "Reglas visuales con disparadores y acciones cuando llegan mensajes SMS (mover o copiar negociaciones, asignar contactos, etc.).",
    smsLiteBindingsTitle: "Agente IA por número",
    smsLiteBindingsDesc:
      "Asocia un agente a cada número para respuestas automáticas, creación de negociaciones y seguimientos.",
    smsLiteBindingsEmpty:
      "Aún no hay agente configurado. Añade uno para activar respuestas con IA y automatización de CRM en un número SMS.",
    smsLiteCreateBinding: "Añadir agente",
    smsLiteEditBinding: "Editar agente por número",
    smsLiteSession: "Número SMS",
    smsLiteRuleTemplatesHint:
      "Crea reglas visuales: cuando llega un mensaje, ejecuta acciones como mover o copiar una negociación, asignar el contacto o cambiar el estado de la conversación. Gana la primera automatización que coincida.",
    smsLiteRuleTemplatesEmpty: "Aún no hay automatizaciones. Crea una para ejecutar acciones cuando llegan mensajes.",
    smsLiteRuleTemplatesAdd: "Nueva automatización",
    smsLiteRuleTemplatesNoSessionsLinked:
      "Ningún número seleccionado — esta automatización no se ejecutará hasta que la edites.",
    smsLiteRuleTemplatesPriority: "Prioridad",
    smsLiteSessionStatusActive: "Activo",
    smsLiteSessionStatusDisabled: "Desactivado",
    smsLiteSessionStatusPendingConfig: "Configuración pendiente",
    smsLiteAddSession: "Añadir número",
    smsLiteEmptySessions: "Aún no hay números SMS configurados",
    smsLiteEmptySessionsHint: 'Haz clic en "Añadir número" para empezar.',
    smsLiteActionsAriaLabel: "Acciones",
    smsLiteSessionEnable: "Activar",
    smsLiteSessionDisable: "Desactivar",
    smsLiteSessionProvider: "Proveedor",
    smsLiteSessionCreatedAt: "Creado el",
    smsLiteEditSessionTitle: "Editar número SMS",
    smsLiteCreateSessionTitle: "Añadir número SMS",
    smsLiteSessionLabel: "Nombre visible",
    smsLiteSessionLabelPlaceholder: "Ej.: Atención comercial",
    smsLiteSessionFromNumber: "Número de origen (Twilio)",
    smsLiteSessionFromNumberPlaceholder: "+15551234567",
    smsLiteSessionAccountSid: "Account SID",
    smsLiteSessionAccountSidPlaceholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    smsLiteSessionAccountSidKeepPlaceholder: "Dejar vacío para mantener el actual",
    smsLiteSessionAuthToken: "Auth Token",
    smsLiteSessionAuthTokenPlaceholder: "Token de autenticación Twilio",
    smsLiteSessionAuthTokenKeepPlaceholder: "Dejar vacío para mantener el actual",
    smsLiteSessionNameRequired: "Introduce el nombre del número.",
    smsLiteSessionFromNumberRequired: "Introduce el número de origen.",
    smsLiteSessionCredentialsRequired: "Introduce Account SID y Auth Token.",
    smsLiteSessionUpdated: "Número SMS actualizado.",
    smsLiteSessionCreated: "Número SMS creado.",
    smsLiteSessionEnabledToast: "Número SMS activado.",
    smsLiteSessionDisabledToast: "Número SMS desactivado.",
    smsLiteSessionDeleted: "Número SMS eliminado.",
    smsLiteDeleteSessionTitle: "Eliminar número SMS",
    smsLiteDeleteSessionConfirm: '¿Seguro que quieres eliminar "{label}"? Esta acción no se puede deshacer.',
    smsLiteBindingSessionSearch: "Buscar números…",
    smsLiteBindingSessionEmptyNoSessions: "No hay números disponibles. Añade uno en la pestaña Números SMS.",
    smsLiteSearchNoResults: "No se encontraron resultados.",
    smsLiteBindingAgentSearch: "Buscar agentes…",
    smsLiteBindingAgentEmptyNoAgents: "No hay agentes en este workspace.",
    smsLiteSelectSession: "Selecciona un número…",
    smsLiteSelectAgent: "Selecciona un agente…",
    smsLiteSelectProject: "Selecciona un proyecto…",
    smsLiteSelectColumn: "Selecciona una columna…",
    smsLiteBindingCreated: "Configuración de agente creada.",
    smsLiteBindingUpdated: "Configuración de agente actualizada.",
    smsLiteBindingPaused: "Configuración de agente en pausa.",
    smsLiteBindingResumed: "Configuración de agente reanudada.",
    smsLiteBindingDeleted: "Configuración de agente eliminada.",
    smsLiteDeleteBindingTitle: "Eliminar configuración de agente",
    smsLiteDeleteBindingConfirm: "¿Seguro que quieres eliminar esta configuración? Esta acción no se puede deshacer.",
    smsLiteBindingLeadProjectColumnRequired: "Selecciona el proyecto y la columna de la negociación.",
    smsLiteFlowNameRequired: "Introduce el nombre del flujo.",
    smsLiteFlowUpdated: "Flujo actualizado.",
    smsLiteFlowCreated: "Flujo creado.",
    smsLiteFlowDeleted: "Flujo eliminado.",
    smsLiteDeleteFlowTitle: "Eliminar flujo SMS",
    smsLiteDeleteFlowConfirm: '¿Seguro que quieres eliminar "{name}"? Esta acción no se puede deshacer.',
    smsLiteIntegrationCardDesc:
      "Envía y recibe SMS vía Twilio. Gestiona conversaciones, automatiza respuestas y sigue leads por SMS.",
    smsLiteIntegrationActivate: "Activar",
    smsLiteIntegrationActiveSessions: "{count} número(s) activo(s)",
    smsLiteIntegrationConfigure: "Configurar",
    smsLiteIntegrationNewSession: "Nuevo número",
    smsLiteIntegrationWizardTitle: "Configurar SMS — Twilio",
    smsLiteIntegrationWizardDesc: "Introduce las credenciales de Twilio para habilitar el envío y recepción de SMS.",
    smsLiteIntegrationCreating: "Creando…",
    smsLiteIntegrationWebhookTitle: "URL del webhook",
    smsLiteIntegrationWebhookDesc: "Configura esta URL como webhook en la consola de Twilio para recibir SMS.",
    smsLiteIntegrationWebhookUrlLabel: "URL del webhook",
    smsLiteIntegrationCopyUrl: "Copiar URL",
    smsLiteIntegrationWebhookCopied: "¡URL del webhook copiada!",
    smsLiteIntegrationContinue: "Continuar",
    smsLiteIntegrationSessionCreatedTitle: "¡Número creado!",
    smsLiteIntegrationSessionCreatedDesc:
      'El número "{label}" se creó correctamente. Puedes gestionar los números SMS en ajustes.',
    smsLiteIntegrationGoToSettings: "Ir a ajustes",
    smsLiteIntegrationClose: "Cerrar",
    instagramLiteNav: "Instagram",
    instagramLiteTitle: "Cuentas de Instagram",
    instagramLiteSubtitle:
      "Gestiona las cuentas de Instagram DM. Agrega cuentas, asigna agentes y configura automatizaciones inbound.",
    instagramLiteIntegrationCardDesc:
      "Envía y recibe DMs de Instagram vía Unipile. Gestiona conversaciones, automatiza respuestas y sincroniza leads.",
    instagramLiteIntegrationActivate: "Agregar cuenta",
    instagramLiteIntegrationActiveSessions: "{count} cuenta(s) activa(s)",
    instagramLiteIntegrationConfigure: "Configurar",
    instagramLiteIntegrationNewAccount: "Nueva cuenta",
    instagramLiteIntegrationAddAccount: "Agregar cuenta de Instagram",
    instagramLiteFreeAccountHint: "Gratis — tu primera cuenta de Instagram está incluida en tu plan.",
    instagramLiteIntegrationAdding: "Redireccionando…",
    instagramLiteIntegrationLabelPlaceholder: "ej. Instagram de la Empresa",
    instagramLiteIntegrationLabelRequired: "Escribe un nombre para esta cuenta.",
    instagramLiteBillingActive: "Activa",
    instagramLiteBillingPastDue: "Pago vencido",
    instagramLiteBillingFree: "Gratis",
    instagramLiteBillingCanceled: "Cancelada",
    instagramLiteBillingPending: "Pendiente",
    instagramLitePaymentStillProcessing: "El pago aún se está procesando. Espera un momento e inténtalo de nuevo.",
    instagramLiteConnectBillingBlocked:
      "No se pudo conectar esta cuenta de Instagram ahora. Inténtalo de nuevo en un momento.",
    instagramLiteStatusConnected: "Conectada",
    instagramLiteStatusPendingConnect: "Conexión pendiente",
    instagramLiteStatusReconnectRequired: "Reconexión requerida",
    instagramLiteStatusDisabled: "Desactivada",
    instagramLiteSessions: "Cuentas",
    instagramLiteSessionsDesc: "Cuentas de Instagram conectadas a este workspace.",
    instagramLiteAutomation: "Agentes",
    instagramLiteAutomationDesc: "Asigna un agente IA por cuenta de Instagram para respuestas automáticas y CRM.",
    instagramLiteTemplates: "Automatizaciones",
    instagramLiteTemplatesDesc: "Reglas visuales inbound activadas por DMs de Instagram.",
    instagramLiteNoSessions: "No hay cuentas de Instagram agregadas aún.",
    instagramLiteUsernamePending: "Username aún no sincronizado — reconecta si persiste.",
    instagramLiteSessionAccessTitle: "Acceso a la cuenta de Instagram",
    instagramLiteSessionAccessDesc: "Controla quién puede ver las conversaciones de",
    smsLiteSessionAccessTitle: "Acceso al número de SMS",
    smsLiteSessionAccessDesc: "Controla quién puede ver las conversaciones de",
    instagramLiteNoTemplates: "No hay automatizaciones de Instagram creadas aún.",
    instagramLiteConnect: "Conectar",
    instagramLiteReconnect: "Reconectar",
    instagramLiteSession: "Cuenta de Instagram",
    instagramLiteBindingsEmpty:
      "Aún no hay agente configurado. Añade uno para activar respuestas con IA y automatización de CRM en una cuenta de Instagram.",
    instagramLiteCreateBinding: "Añadir agente",
    messagingBindingNoAgentAssigned: "Ningún agente asignado",
    messagingBindingScopeConversation: "Solo una conversación",
    messagingBindingScopeConversationHint:
      "Este agente solo responde en un chat. Para responder todas las conversaciones nuevas de este número, añade un agente para todo el número.",
    messagingBindingAutoUpdate: "Auto-update",
    messagingBindingEditAria: "Editar vínculo del agente",
    messagingBindingPauseAria: "Pausar vínculo del agente",
    messagingBindingResumeAria: "Reanudar vínculo del agente",
    messagingBindingDeleteAria: "Eliminar vínculo del agente",
    whatsappLiteTitle: "Números de WhatsApp",
    whatsappLiteSubtitle:
      "Conecta números de WhatsApp al workspace. Cada número puede alimentar el inbox y las reglas de automatización.",
    whatsappLiteSessions: "Números de WhatsApp",
    whatsappLiteAddSession: "Añadir número",
    whatsappLitePaidPlanRequired:
      "Las líneas de WhatsApp están disponibles en planes de pago. Mejora tu plan para añadir un número.",
    whatsappLiteTransport: "Tipo de conexión",
    whatsappLiteTransportBaileys: "WhatsApp Web (código QR)",
    whatsappLiteTransportCloud: "Cloud API (Meta oficial)",
    whatsappLiteTransportBaileysHint: "Conecta escaneando un código QR, como en WhatsApp Web.",
    whatsappLiteTransportCloudHint:
      "API oficial de Meta: completa las credenciales abajo. JSYNQ valida, registra el número en Meta y conecta los webhooks automáticamente.",
    whatsappLiteCloudAddDesc:
      "Usa el mismo WABA ID, Phone Number ID y token de System User del Meta Business Manager. Deja el PIN en blanco, salvo que este número ya tenga verificación en dos pasos.",
    whatsappLiteEmbeddedSignupDesc:
      "Inicia sesión con Meta para elegir la cuenta de WhatsApp Business y el número. JSYNQ lo registra. Si el número ya tiene PIN de verificación en dos pasos, lo ingresas después de que Meta acepte el login.",
    whatsappLiteEmbeddedSignupContinue: "Continuar con Meta",
    whatsappLiteEmbeddedSignupShowManual: "Introducir credenciales WABA manualmente",
    whatsappLiteEmbeddedSignupHideManual: "Ocultar credenciales manuales",
    whatsappLiteEmbeddedSignupMissingIds:
      "Meta no devolvió el ID de la cuenta de WhatsApp Business o del número. Completa Embedded Signup e inténtalo de nuevo.",
    whatsappLiteEmbeddedSignupFailed: "No se pudo completar el Embedded Signup de Meta.",
    whatsappLiteEmbeddedSignupPinTitle: "PIN de verificación en dos pasos",
    whatsappLiteEmbeddedSignupPinDesc:
      "Este número ya tiene PIN de verificación en dos pasos. Ingresa el PIN de 6 dígitos de WhatsApp Manager.",
    whatsappLiteEmbeddedSignupPinSubmit: "Registrar número",
    whatsappLiteCloudSetupIntro:
      "Antes de guardar, confirma que el número está añadido y verificado en WhatsApp Manager. JSYNQ lo registra en Meta por ti — sin curl manual.",
    whatsappLiteCloudSetupStep1: "Añade y verifica el número en WhatsApp Manager (SMS o voz).",
    whatsappLiteCloudSetupStep2:
      "Copia WABA ID y Phone Number ID en Business Manager / Developers — no el +55 que ve el cliente.",
    whatsappLiteCloudSetupStep3:
      "Pega el token de System User y el PIN de verificación en dos pasos (existente o nuevo).",
    whatsappLiteCloudSectionIds: "Identificadores Meta",
    whatsappLiteCloudSectionSecrets: "Token y registro",
    whatsappLiteCloudWabaId: "ID de la cuenta de WhatsApp Business",
    whatsappLiteCloudWabaIdHint: "WhatsApp Manager → Resumen de la cuenta, o Configuración → Cuentas de WhatsApp.",
    whatsappLiteCloudPhoneNumberId: "ID del número de teléfono",
    whatsappLiteCloudPhoneNumberIdHint:
      "Meta for Developers → WhatsApp → API Setup. Es un ID numérico, no el teléfono visible para clientes.",
    whatsappLiteCloudAccessToken: "Token de acceso",
    whatsappLiteCloudAccessTokenHint:
      "Token permanente de System User con whatsapp_business_messaging y whatsapp_business_management. Se guarda cifrado — no se vuelve a mostrar.",
    whatsappLiteCloudPin: "PIN de verificación en dos pasos",
    whatsappLiteCloudPinHint:
      "Déjalo en blanco si el número no tiene verificación en dos pasos. JSYNQ define un PIN. Si Meta ya tiene uno, ingresa esos 6 dígitos.",
    whatsappLiteCloudPinProgress: "{count}/6 dígitos",
    whatsappLiteCloudShowPin: "Mostrar PIN",
    whatsappLiteCloudHidePin: "Ocultar PIN",
    whatsappLiteCloudMetaLink: "Abrir WhatsApp Manager → Números de teléfono",
    whatsappLiteCloudConnectSaving: "Conectando y registrando…",
    whatsappLiteCloudUpdateCredentials: "Actualizar credenciales Cloud API",
    whatsappLiteCloudUpdateTitle: "Actualizar credenciales Cloud API",
    whatsappLiteCloudUpdateDesc:
      "Vuelve a introducir el token y el PIN. JSYNQ revalida con Meta y vuelve a registrar el número si hace falta.",
    whatsappLiteCloudUpdateSaving: "Actualizando credenciales…",
    whatsappLiteCloudRegistered: "Número Cloud API conectado y registrado en Meta",
    whatsappLiteCloudAlreadyRegistered: "Número Cloud API conectado (ya estaba registrado en Meta)",
    whatsappLiteCloudUpdated: "Credenciales Cloud API actualizadas",
    whatsappLiteCloudConnected: "Número de Cloud API conectado",
    whatsappLiteCloudTemplatesTab: "Plantillas",
    whatsappLiteCloudTemplatesTitle: "Plantillas de mensaje",
    whatsappLiteCloudTemplatesDesc:
      "Plantillas aprobadas por Meta para iniciar conversaciones fuera de la ventana de 24 horas.",
    whatsappLiteCloudTemplatesEmpty: "Aún no hay plantillas. Sincroniza con Meta o crea una nueva.",
    whatsappLiteCloudTemplatesSync: "Sincronizar con Meta",
    whatsappLiteCloudTemplatesSynced: "{count} plantillas sincronizadas",
    whatsappLiteCloudTemplatesCreate: "Nueva plantilla",
    whatsappLiteCloudTemplateName: "Nombre",
    whatsappLiteCloudTemplateNameHint: "Minúsculas, sin espacios. Los espacios se convierten en guiones bajos.",
    whatsappLiteCloudTemplateLanguage: "Idioma",
    whatsappLiteCloudTemplateCategory: "Categoría",
    whatsappLiteCloudTemplateHeader: "Encabezado (opcional)",
    whatsappLiteCloudTemplateHeaderType_NONE: "Ninguno",
    whatsappLiteCloudTemplateHeaderType_TEXT: "Texto",
    whatsappLiteCloudTemplateHeaderType_IMAGE: "Imagen",
    whatsappLiteCloudTemplateHeaderType_VIDEO: "Video",
    whatsappLiteCloudTemplateHeaderType_DOCUMENT: "Documento",
    whatsappLiteCloudTemplateHeaderTextPlaceholder: "Texto del encabezado",
    whatsappLiteCloudTemplateHeaderUpload: "Subir archivo de ejemplo",
    whatsappLiteCloudTemplateHeaderUploadHint:
      "Meta exige un ejemplo para aprobar un encabezado multimedia. El medio real se elige al enviar.",
    whatsappLiteCloudTemplateBodyExamples: "Ejemplos de variables",
    whatsappLiteCloudTemplateBodyExamplesHint:
      "Valores de ejemplo para cada variable, exigidos por Meta para la aprobación.",
    whatsappLiteCloudTemplateBodyExamplePlaceholder: "Valor de ejemplo",
    whatsappLiteCloudTemplateButtons: "Botones (opcional)",
    whatsappLiteCloudTemplateButtonQuickReply: "Respuesta rápida",
    whatsappLiteCloudTemplateButtonUrl: "Enlace",
    whatsappLiteCloudTemplateButtonText: "Texto del botón",
    whatsappLiteCloudTemplateAddButton: "Agregar botón",
    whatsappLiteCloudTemplateRemoveButton: "Eliminar botón",
    whatsappLiteCloudTemplateBody: "Cuerpo",
    whatsappLiteCloudTemplateBodyHint:
      "Usa {{1}}, {{2}} para variables completadas al enviar. Se permiten saltos de línea en el texto fijo (máx. 2 seguidos). Los valores de las variables no pueden contener saltos de línea.",
    whatsappLiteCloudTemplateFooter: "Pie (opcional)",
    whatsappLiteCloudTemplateCreated: "Plantilla enviada a Meta para revisión",
    whatsappLiteCloudTemplateDeleted: "Plantilla eliminada",
    whatsappLiteCloudTemplateDeleteTitle: "Eliminar plantilla",
    whatsappLiteCloudTemplateDeleteConfirm: '¿Eliminar la plantilla "{name}"? También se elimina de Meta.',
    whatsappLiteCloudTemplateVarBindingsTitle: "Mapeo de variables CRM (opcional)",
    whatsappLiteCloudTemplateVarBindingsDesc:
      "Opcional. Rellena automáticamente en la bandeja desde el CRM cuando la conversación está vinculada a una tarjeta. Sin mapeo, rellenas manualmente al enviar.",
    whatsappLiteTemplateSettingsTitle: "Configuración de la plantilla",
    whatsappLiteTemplateSettingsSubtitle: "Configura los parámetros y variables de la plantilla seleccionada.",
    whatsappLiteTemplateIdentification: "Identificación",
    whatsappLiteTemplateLanguageSection: "Idioma",
    whatsappLiteTemplateVarColumn: "Variable",
    whatsappLiteTemplateCrmFieldColumn: "Campo CRM",
    whatsappLiteTemplateVarsFound: "{count} variables encontradas",
    whatsappLiteTemplatePrimaryLanguage: "Idioma principal",
    whatsappLiteTemplateSaveChanges: "Guardar cambios",
    whatsappLiteTemplateUnsavedTitle: "¿Descartar cambios?",
    whatsappLiteTemplateUnsavedDesc: "Hay cambios sin guardar. ¿Cerrar sin guardar?",
    whatsappLiteKeepEditing: "Seguir editando",
    whatsappLitePreviewMessagePlaceholder: "Mensaje",
    whatsappLiteCloudNoSessions: "Conecta primero un número de Cloud API para gestionar plantillas.",
    whatsappLiteCloudSelectSession: "Número",
    whatsappLiteWorkspaceTemplatesTab: "Atajos",
    whatsappLiteWorkspaceTemplatesTabDesc:
      "Mensajes reutilizables para autocompletado en la bandeja y campañas Baileys. En números Cloud API funcionan dentro de la ventana de 24 horas.",
    messagingShortcutsNav: "Atajos",
    messagingShortcutsSubtitle:
      "Crea mensajes reutilizables para WhatsApp y SMS. El equipo puede insertarlos con el botón flash del compositor o escribiendo :atajo.",
    messagingShortcutsSearchPlaceholder: "Buscar título o mensaje…",
    messagingShortcutsSessionFilterLabel: "Línea WhatsApp",
    messagingShortcutsSessionFilterAll: "Todas las líneas",
    messagingShortcutsLoadingMore: "Cargando más…",
    whatsappLiteWorkspaceTemplatesTitle: "Mensajes guardados",
    whatsappLiteWorkspaceTemplatesDesc:
      "Mensajes guardados con variables {{1}}, {{2}}… Se envían como texto normal, sin aprobación de Meta. En números oficiales Cloud API, solo dentro de la ventana de 24 horas.",
    whatsappLiteWorkspaceTemplatesEmpty: "Aún no hay mensajes guardados.",
    whatsappLiteWorkspaceTemplatesCreate: "Nuevo mensaje",
    whatsappLiteWorkspaceTemplateName: "Nombre",
    whatsappLiteWorkspaceTemplateNameHint: "Se muestra en los selectores y el autocompletado.",
    whatsappLiteWorkspaceTemplateShortcut: "Atajo",
    whatsappLiteWorkspaceTemplateShortcutHint:
      "Opcional. Escribe :atajo en el compositor para autocompletar este mensaje.",
    whatsappLiteWorkspaceTemplateBody: "Mensaje",
    whatsappLiteWorkspaceTemplateBodyHint: "Usa {{1}}, {{2}}… para variables.",
    whatsappLiteWorkspaceTemplatePreview: "Vista previa",
    whatsappLiteWorkspaceTemplateEdit: "Editar mensaje",
    whatsappLiteWorkspaceTemplateCreated: "Mensaje creado",
    whatsappLiteWorkspaceTemplateUpdated: "Mensaje actualizado",
    whatsappLiteWorkspaceTemplateDeleted: "Mensaje eliminado",
    whatsappLiteWorkspaceTemplateDeleteTitle: "¿Eliminar mensaje?",
    whatsappLiteWorkspaceTemplateDeleteConfirm: '¿Eliminar el mensaje "{name}"? No se puede deshacer.',
    whatsappLiteWorkspaceTemplateAttachments: "Adjuntos",
    whatsappLiteWorkspaceTemplateAttachmentBadge: "{count} archivos",
    whatsappLiteLabel: "Nombre visible",
    whatsappLiteRename: "Renombrar",
    whatsappLiteReconnectSession: "Reconectar (emparejamiento guardado)",
    whatsappLiteReconnectStarted: "Reconexión iniciada. El estado debería actualizarse en unos segundos.",
    whatsappLiteSessionAccessTitle: "Acceso al número de WhatsApp",
    whatsappLiteSessionAccessDesc: "Define quién puede acceder a las conversaciones de",
    messagingAclAccessDescTail: "y qué acciones puede ejecutar.",
    messagingAclScopeUserAssigned: "Solo las asignadas",
    messagingAclScopeAll: "Todas las conversaciones",
    messagingAclScopeRoleAssigned: "Solo las propias",
    messagingAclScopeRoleGroup: "Conversaciones del grupo",
    messagingAclScopeRoleAll: "Todas las conversaciones",
    whatsappLiteSessionSharingWith: "Compartiendo con",
    whatsappLiteSessionNoAccessYet: "Aún no hay personas añadidas.",
    whatsappLiteSessionAddRole: "Agregar rol",
    whatsappLiteSessionNoRolesToAdd: "No hay roles para agregar",
    whatsappLiteSessionCanEdit: "Puede editar",
    whatsappLiteSessionCanView: "Puede ver",
    whatsappLiteSessionNeedUserOrRole: "Añade al menos una persona o rol antes de restringir el acceso.",
    whatsappLiteSessionMakePublic: "Hacer visible para todos",
    whatsappLiteSessionMakePrivate: "Guardar cambios",
    whatsappLiteConnectQr: "Conectar con QR",
    whatsappLiteDelete: "Eliminar número",
    whatsappLiteDeleteConfirmDescription:
      "Esto desvincula el número y elimina las credenciales guardadas para este número de WhatsApp. No se puede deshacer.",
    whatsappLiteQrTitle: "Escanear código QR",
    whatsappLiteQrHelp:
      "En el móvil: WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo. Escanea el código.",
    whatsappLiteStatusDisconnected: "Desconectado",
    whatsappLiteStatusQrPending: "Esperando QR",
    whatsappLiteStatusConnected: "Conectado",
    whatsappLiteStatusBanned: "Restringido",
    whatsappLiteEmptySessions: "Aún no hay números de WhatsApp. Añade uno para iniciar el emparejamiento.",
    whatsappLiteAutomation: "Agentes",
    whatsappLiteTabSessionsDesc: "Conecta y gestiona los números de WhatsApp de este workspace.",
    whatsappLiteTabAutomationDesc:
      "Agente IA por número, creación automática de negociaciones, seguimientos y distribución inteligente de contactos.",
    whatsappLiteTabFlowsDesc:
      "Reglas visuales con disparadores y acciones cuando llegan mensajes (mover o copiar negociaciones, asignar contactos, etc.).",
    whatsappLiteBindingsTitle: "Agente IA por número",
    whatsappLiteBindingsDesc:
      "Asocia un agente a cada número para respuestas automáticas, creación de negociaciones y seguimientos.",
    whatsappLiteBindingsEmpty:
      "Aún no hay agente configurado. Añade uno para activar respuestas con IA y automatización de CRM en un número de WhatsApp.",
    whatsappLitePause: "Pausar",
    whatsappLiteResume: "Reanudar",
    whatsappLiteRefresh: "Actualizar",
    whatsappLiteEntityStatusActive: "Activa",
    whatsappLiteEntityStatusPaused: "En pausa",
    whatsappLiteEntityStatusDraft: "Borrador",
    whatsappLiteEntityStatusRunning: "En ejecución",
    whatsappLiteEntityStatusCompleted: "Completada",
    whatsappLiteEntityStatusCancelled: "Cancelada",
    whatsappLiteEntityStatusFailed: "Fallida",
    whatsappLiteBindingModeAutoReply: "Respuesta automática",
    whatsappLiteBindingModeFirstMessageOnly: "Solo primer mensaje",
    whatsappLiteBindingModeWorkflowTrigger: "Disparador de workflow",
    whatsappLiteBindingScopeAllInbound: "Todos los mensajes entrantes",
    whatsappLiteCreateBinding: "Añadir agente",
    whatsappLiteAgent: "Agente",
    whatsappLiteAgentChannelHint:
      "Cada binding debe usar un agente con el canal WhatsApp activado. El runtime usa ese agente para respuestas y automatización.",
    whatsappLiteNoAgentsWithWhatsappChannel:
      "No se encontraron agentes con WhatsApp activado. Activa WhatsApp en un agente en Automatización y actualiza esta página.",
    whatsappLiteSession: "Número de WhatsApp",
    whatsappLiteModeAutoReply: "Respuesta automática",
    whatsappLiteMaxRepliesDay: "Máx. respuestas por día",
    whatsappLiteStopPolling: "Cerrar",
    whatsappLiteConnectedAs: "Conectado como {phone}",
    whatsappLitePickAgentSession: "Selecciona un agente y un número de WhatsApp.",
    whatsappLiteQrRequestFailed: "No se pudo cargar el código QR del servidor.",
    whatsappLiteQrWaitingServer: "Esperando a que el servidor genere el código de vinculación…",
    whatsappLiteQrSlowHint:
      "Está tardando más de lo habitual. Comprueba que el servicio WhatsApp del backend está en marcha y que el número espera el QR. Puedes cerrar y volver a abrir «Conectar con QR».",
    whatsappLiteQrPairingFailed:
      "WhatsApp cerró la conexión antes de mostrar el QR. Elimina este número en ajustes, asegúrate de que workspace-backend corre con una versión de Node compatible y añade un número de WhatsApp nuevo.",
    whatsappLiteConnectModalTitle: "Añadir número de WhatsApp",
    whatsappLiteConnectModalSubtitleBefore: "Conecta y gestiona WhatsApp para el workspace ",
    whatsappLiteConnectModalSubtitleAfter: ".",
    whatsappLiteLabelPlaceholder: "Ej.: Ventas",
    whatsappLiteSyncHistoryTitle: "Sincronizar historial de conversaciones",
    whatsappLiteSyncHistoryDesc: "Sincroniza automáticamente el historial de conversaciones anteriores",
    whatsappLiteWhatsAppWeb: "WhatsApp Web",
    whatsappLiteMetaApiOfficial: "API oficial de Meta",
    whatsappLiteMetaApiComingSoon: "Próximamente",
    whatsappLiteQrHelpBefore: "Abre WhatsApp, ve a Dispositivos vinculados y pulsa ",
    whatsappLiteQrHelpHighlight: "Vincular dispositivo",
    whatsappLiteQrHelpAfter: " en tu celular",
    whatsappLiteQrConnectionFailed: "No se pudo establecer la conexión. Actualiza el código QR e inténtalo de nuevo.",
    whatsappLiteQrRefreshAria: "Actualizar código QR",
    whatsappLiteConnectedTitle: "{name} está conectado",
    whatsappLiteConnectedDesc: "Ya puedes usar WhatsApp en tu workspace para atender conversaciones.",
    whatsappLiteSetupLaterHint: "También puedes configurar el número más tarde en ajustes.",
    whatsappLiteDoItLater: "Hacerlo después",
    whatsappLiteDisconnectBannerTitle: "Número de WhatsApp desconectado",
    whatsappLiteDisconnectBannerBody: "{label} está desconectado. Reconéctalo para seguir las conversaciones.",
    whatsappLiteDisconnectBannerSeeLater: "Ver después",
    whatsappLiteDisconnectBannerTakeAction: "Resolver",
    whatsappLiteFinish: "Finalizar",
    whatsappLiteEditBinding: "Editar agente por número",
    whatsappLiteAutoCreateLead: "Crear negociación automáticamente",
    whatsappLiteAutoCreateLeadHint:
      "Cuando un contacto nuevo no está vinculado a una negociación, crea una en el proyecto y columna de abajo. Si ese contacto ya tiene una negociación en ese proyecto, se reutiliza.",
    whatsappLiteBindingSendReply: "Permitir respuesta automática en WhatsApp",
    whatsappLiteBindingSendReplyHint:
      "Si está activo, la respuesta generada por el agente puede enviarse al contacto en este número de WhatsApp. Desactívalo para ejecutar el agente sin enviar mensajes.",
    whatsappLiteBindingSendReplyOn: "Respuesta automática: activa",
    whatsappLiteBindingSendReplyOff: "Respuesta automática: desactivada",
    whatsappLiteBindingAllowImageGeneration: "Permitir generar/editar imágenes",
    bindingPermissionsTitle: "Qué puede hacer el agente además de responder",
    bindingPermissionsHint:
      "Por defecto el agente solo responde a este contacto. Todo lo de abajo viene desactivado por seguridad: quien escribe en este canal es externo a tu equipo.",
    bindingWorkspaceAccess: "Datos del workspace",
    bindingWorkspaceAccessHint:
      "Tarjetas, proyectos y documentos. Con lectura, un contacto puede obtener esta información preguntando al agente.",
    bindingWorkspaceAccessNone: "Sin acceso",
    bindingWorkspaceAccessRead: "Lectura",
    bindingWorkspaceAccessReadWrite: "Lectura y cambios",
    bindingAllowMessagingOthers: "Enviar a otros contactos",
    bindingAllowMessagingOthersHint:
      "Permite que el agente envíe mensajes de WhatsApp a otros números o conversaciones (ej.: avisar al vendedor de un lead caliente).",
    bindingAllowReadingOtherConversations: "Ver otras conversaciones",
    bindingAllowReadingOtherConversationsHint:
      "Permite que el agente liste y lea conversaciones de WhatsApp de otros contactos. Rara vez necesario: un contacto podría preguntar por otros clientes.",
    whatsappLiteBindingAllowImageGenerationHint:
      "Cuando está activado, el agente puede generar o editar imágenes si el contacto lo solicita en la conversación. Cada imagen tiene un costo real — déjelo desactivado a menos que sea necesario.",
    whatsappLiteBindingWorkspaceAccessTitle: "Acceso al workspace en WhatsApp",
    whatsappLiteBindingWorkspaceAccessDesc:
      "Por defecto, los agentes en WhatsApp no pueden leer ni cambiar datos internos del workspace (documentos, tarjetas, proyectos). Activa estas opciones solo para contactos de confianza, como corredores internos.",
    whatsappLiteBindingAllowEnumeration: "Permitir lectura de datos del workspace (documentos, biblioteca, proyectos)",
    whatsappLiteBindingAllowEnumerationHint:
      "Desbloquea herramientas de solo lectura como list_documents y get_document para que el agente responda con la biblioteca completa — no solo fragmentos de búsqueda semántica.",
    whatsappLiteBindingAllowWrites: "Permitir crear y actualizar datos en el workspace",
    whatsappLiteBindingAllowWritesHint:
      "También desbloquea herramientas de escritura (crear/actualizar tarjetas, documentos, etc.) desde WhatsApp. Requiere la lectura anterior. Úsalo con precaución en contactos externos.",
    whatsappLiteBindingEnumerationOn: "Lectura de biblioteca: activa",
    whatsappLiteBindingEnumerationOff: "Lectura de biblioteca: inactiva",
    whatsappLiteBindingWritesOn: "Cambios en el workspace: activos",
    whatsappLiteBindingWritesOff: "Cambios en el workspace: inactivos",
    whatsappLiteAiAutomationRequiresPlan:
      "La automatización de WhatsApp con IA (respuestas automáticas, enrutamiento por LLM, seguimientos redactados por el agente) no está incluida en tu plan actual.",
    whatsappLiteFlowModalClose: "Cerrar",
    whatsappLiteSelectPlaceholder: "Elegir…",
    whatsappLiteLeadProject: "Proyecto",
    whatsappLiteLeadProjectSearch: "Buscar proyectos…",
    whatsappLiteLeadProjectNoMatch: "Ningún proyecto coincide con la búsqueda.",
    whatsappLiteLeadCrmBoardsHint:
      "Luego elige el board y la columna CRM. Los boards de tipo CRM salen primero, también pipelines CRM dentro de proyectos kanban.",
    whatsappLiteLeadBoard: "Board",
    whatsappLiteLeadColumn: "Columna (etapa)",
    whatsappLiteLeadSource: "Origen",
    whatsappLiteNoCrmProjects: "No hay proyectos CRM en este workspace. Crea un proyecto CRM primero.",
    whatsappLiteNoProjects: "No hay proyectos en este workspace.",
    whatsappLitePickProjectColumn: "Elige el proyecto y la columna de la nueva negociación.",
    whatsappLiteAutoLeadPriority: "Ajustar la prioridad de la negociación según la actividad en WhatsApp",
    whatsappLiteAutoLeadPriorityHint:
      "Permite al servidor actualizar la prioridad de la negociación (frío / tibio / caliente) según el engagement, hasta tener workflows. Usa el campo de prioridad del CRM.",
    whatsappLiteBindingLeadLine: "Negociación automática: proyecto «{project}»",
    whatsappLiteBindingLeadOff: "Negociación automática: desactivada",
    whatsappLiteBindingPriorityOn: "Automatización de prioridad: activa",
    whatsappLiteBindingPriorityOff: "Automatización de prioridad: inactiva",
    whatsappLiteBindingUpdated: "Regla de automatización actualizada",
    crmLeadSyncEnabled: "Actualizar la negociación automáticamente",
    crmLeadSyncActivate: "Activar sincronización",
    crmLeadSyncEnabledHint:
      "Tras conversaciones (con debounce), un agente de IA actualiza la tarea vinculada. No se ejecuta en cada mensaje.",
    crmLeadSyncAgentLabel: "Agente de sincronización",
    crmLeadSyncAgentInherit: "Igual que el agente entrante",
    crmLeadSyncInstructions: "Qué puede cambiar el agente",
    crmLeadSyncInstructionsPlaceholder:
      "p. ej. Solo descripción y etiquetas; no cambiar fecha límite sin confirmación.",
    crmLeadSyncInstructionsHint: "Vacío = valores por defecto sensatos.",
    crmLeadSyncAllowedFields: "Campos permitidos",
    crmLeadSyncAllowedFieldsHint: "Los campos no marcados no deben modificarse.",
    crmLeadSyncTriggers: "Cuándo programar sincronización",
    crmLeadSyncTriggerAfterReply: "Tras la respuesta del agente",
    crmLeadSyncTriggerAfterInbound: "Tras cada mensaje entrante (debounce)",
    crmLeadSyncTriggerIdle: "Cuando la conversación quede inactiva",
    crmLeadSyncMinInterval: "Intervalo mínimo (minutos)",
    crmLeadSyncMinIntervalHint: "Evita reescribir el lead en cada mensaje.",
    crmLeadSyncModel: "Modelo",
    crmLeadSyncFieldDescription: "Descripción",
    crmLeadSyncFieldLabels: "Etiquetas",
    crmLeadSyncFieldEmail: "Email",
    crmLeadSyncFieldPhone: "Teléfono",
    crmLeadSyncFieldDeadline: "Fecha límite",
    crmLeadSyncFieldContactName: "Nombre de contacto",
    crmLeadSyncFieldCompany: "Empresa",
    crmLeadSyncFieldName: "Título del card",
    crmLeadSyncFieldCustomFields: "Personalizados",
    whatsappLiteFollowupMaxHint: "1 = un mensaje. Máx. 10.",
    whatsappLiteFollowupTimingModeAfter: "Después de un intervalo",
    whatsappLiteFollowupTimingModeAt: "A una hora específica",
    whatsappLiteFollowupSendAtTime: "Enviar a las (hora local)",
    whatsappLiteFollowupSendAtTimeHint: "Envía en la próxima ocurrencia de esta hora (zona horaria del workspace).",
    whatsappLiteFollowupRequireBusinessHours: "Solo enviar en horario laboral del workspace",
    whatsappLiteFollowupMessagesPlaceholder: "Añade un mensaje por paso",
    whatsappLiteFollowupAddMessage: "Añadir mensaje",
    whatsappLiteFollowupRemoveMessage: "Quitar",
    whatsappLiteFollowupMessageN: "Mensaje {{n}}",
    whatsappLiteFollowupUseAgentConversationHint:
      "El agente genera cada seguimiento con el contexto de la conversación (tema y última petición). Deja los mensajes fijos vacíos. Si la IA no genera texto, no enviamos un mensaje genérico.",
    whatsappLiteFollowupAgentFallbackHint:
      "Si se deja vacío, recurre a otro agente ya usado en esta regla, o al agente asignado a la conversación — pero la generación por IA puede no ejecutarse sin uno de estos.",
    whatsappLiteFollowupMessagesOptionalWithAiHint:
      "Opcional aquí — cualquier ronda sin mensaje fijo abajo será generada por el agente de IA.",
    whatsappLiteFollowupScheduleFromConversation: "Programar según la fecha de la conversación",
    whatsappLiteFollowupScheduleFromConversationHint:
      "La IA extrae la fecha del evento/plazo del chat (solo mes → día 1, mitad de año → junio, etc.). Si no hay fecha, usa el retraso de arriba.",
    whatsappLiteFollowupDaysBeforeEvent: "Días de antelación",
    whatsappLiteFollowupOnEventDay: "El día del evento",
    whatsappLiteFollowupEventOffsets: "Enviar estas rondas antes del evento",
    whatsappLiteFollowupEventOffsetsHint:
      'Una o más antelaciones — ej.: 1 día antes Y 30 minutos antes envían dos seguimientos separados. Usa 0 para "el día del evento".',
    whatsappLiteFollowupAddEventOffset: "Agregar otra antelación",
    whatsappLiteRuleTemplatesLinkedCardMode: "Modo de coincidencia",
    whatsappLiteRuleTemplatesLinkedCardModeIn: "Está en…",
    whatsappLiteRuleTemplatesLinkedCardModeNotIn: "No está en…",
    whatsappLiteRuleTemplatesLinkedCardHintNotIn:
      "Coincide si el lead CRM vinculado está fuera de todas estas filas proyecto/columna (O). Sin lead vinculado también coincide.",
    whatsappLiteOutboundSourceText: "Texto libre",
    whatsappLiteOutboundSourceShortcut: "Atajo del workspace",
    whatsappLiteOutboundSourceMeta: "Plantilla oficial Meta",
    whatsappLiteOutboundPickTemplate: "Seleccionar plantilla…",
    whatsappLiteOutboundTextPlaceholder: "Texto del mensaje",
    whatsappLiteOutboundTextOptional: "Vista previa / fallback opcional",
    whatsappLiteOutboundTemplateHint:
      "Al seleccionar un atajo o plantilla Meta se rellena el texto. Los atajos se envían como mensaje normal; Meta usa HSM oficial cuando el gateway Cloud API está disponible (si no, se envía el texto de vista previa).",
    whatsappLiteRuleTemplatesWhenLinkedCard: "El lead está en proyecto / columna…",
    whatsappLiteRuleTemplatesWhenNewLead: "Nuevo lead creado",
    whatsappLiteRuleTemplatesWhenNewLeadFunnel: "Nuevo lead en embudo",
    whatsappLiteRuleTemplatesNewLeadScope: "Alcance del nuevo lead",
    whatsappLiteRuleTemplatesNewLeadScopeWorkspace: "Cualquier embudo (workspace)",
    whatsappLiteRuleTemplatesNewLeadScopeFunnel: "Embudo específico",
    whatsappLiteRuleTemplatesNewLeadWorkspaceHint:
      "Se activa cuando se crea un lead CRM nuevo en este inbound—por auto-creación del binding de sesión o por la acción Crear lead en CRM en esta misma regla. No coincide al vincular o reutilizar una tarjeta existente.",
    whatsappLiteRuleTemplatesNewLeadFunnelHint:
      "Se activa cuando se crea un lead nuevo en el proyecto seleccionado, incluido cuando Crear lead en CRM en esta regla crearía uno. Deja columnas vacías para cualquier columna del tablero en ese proyecto.",
    whatsappLiteRuleTemplatesLinkedCardHint:
      "Coincide si el lead CRM vinculado está en cualquiera de estas filas proyecto/columna (O). Deja columnas vacías para cualquier columna del proyecto.",
    whatsappLiteRuleTemplatesLinkedCardRow: "Proyecto/columna {{n}}",
    whatsappLiteRuleTemplatesAnyColumn: "Cualquier columna",
    whatsappLiteRuleTemplatesAddLinkedCardOr: "Añadir proyecto/columna (O)",
    whatsappLiteRuleTemplatesConditionsMatch: "Combinar condiciones",
    whatsappLiteRuleTemplatesMatchAll: "Todas (Y)",
    whatsappLiteRuleTemplatesMatchAny: "Cualquiera (O)",
    whatsappLiteFollowupEnabled: "Activar seguimiento automático",
    whatsappLiteFollowupEnabledHint: "Cuando el lead no responde a tiempo.",
    whatsappLiteFollowupAllowAgentScheduling: "Permitir que el agente programe seguimientos a pedido",
    whatsappLiteFollowupAllowAgentSchedulingHint:
      'Permite que el agente programe o reprograme el seguimiento de esta conversación cuando se lo pidan en el chat (ej: "llámame en 5 minutos"), independientemente de la programación automática de arriba.',
    whatsappLiteFollowupOnlyWhenLinkedCard: "Solo cuando la tarjeta CRM vinculada coincida con columnas",
    whatsappLiteFollowupOnlyWhenLinkedCardHint:
      "Los seguimientos se programan y envían solo si la tarjeta vinculada de la conversación está (o no está) en las columnas seleccionadas. Cambiar esto cancela seguimientos pendientes.",
    whatsappLiteFollowupOnlyWhenLinkedCardNeedsProject:
      "Selecciona al menos un proyecto para la condición de columna del seguimiento.",
    whatsappLiteFollowupMax: "Máx. seguimientos",
    whatsappLiteFollowupFirstDelay: "Enviar después de",
    whatsappLiteFollowupFirstDelayValue: "Valor del intervalo",
    whatsappLiteFollowupSubsequentDelay: "Intervalo entre seguimientos",
    whatsappLiteFollowupSubsequentDelayValue: "Valor del intervalo",
    whatsappLiteFollowupStopOnReply: "Detener seguimientos cuando el contacto responda",
    whatsappLiteFollowupUseAgent: "Usar agente IA para generar mensajes de seguimiento",
    whatsappLiteMaxRepliesInvalid: "Introduce un máximo válido de respuestas por día (número ≥ 1).",
    whatsappLiteRuleTemplates: "Automatizaciones",
    whatsappLiteRuleTemplatesHint:
      "Crea reglas visuales: cuando llega un mensaje, ejecuta acciones como mover o copiar una negociación, asignar el contacto o cambiar el estado de la conversación. Gana la primera automatización que coincida.",
    whatsappLiteRuleTemplatesEmpty:
      "Aún no hay automatizaciones. Crea una para ejecutar acciones cuando llegan mensajes.",
    whatsappLiteRuleTemplatesAdd: "Nueva automatización",
    whatsappLiteRuleTemplatesName: "Nombre",
    whatsappLiteRuleTemplatesSessionsLabel: "Números de WhatsApp",
    whatsappLiteRuleTemplatesSessionsHint: "Solo en números seleccionados.",
    whatsappLiteRuleTemplatesSessionsEmpty: "Conecte primero un número de WhatsApp para usar esta automatización.",
    whatsappLiteRuleTemplatesSessionsRequired: "Seleccione al menos un número de WhatsApp para esta automatización.",
    whatsappLiteRuleTemplatesSessionsChoose: "Elegir números…",
    whatsappLiteRuleTemplatesSessionsCountSelected: "{count} seleccionados",
    whatsappLiteRuleTemplatesNoSessionsLinked:
      "Sin número seleccionado — la automatización no se ejecutará hasta que la edite.",
    whatsappLiteRuleTemplatesPriority: "Prioridad",
    whatsappLiteRuleTemplatesStatus: "Estado",
    whatsappLiteRuleTemplatesStatusActive: "Activa",
    whatsappLiteRuleTemplatesStatusPaused: "En pausa",
    whatsappLiteRuleTemplatesRootJson: "Reglas de entrada",
    whatsappLiteRuleTemplatesJsonError: "JSON inválido en el DSL.",
    whatsappLiteRuleTemplatesCreateTitle: "Crear automatización WhatsApp",
    whatsappLiteRuleTemplatesEditTitle: "Editar automatización WhatsApp",
    smsLiteRuleTemplatesCreateTitle: "Crear automatización SMS",
    smsLiteRuleTemplatesEditTitle: "Editar automatización SMS",
    smsLiteTemplateFlowDragHint:
      "Arrastre condiciones y acciones para reordenar. Use + entre pasos para añadir una condición.",
    smsLiteRuleTemplatesSessionsLabel: "Números SMS",
    smsLiteRuleTemplatesSessionsHint: "Solo en números seleccionados.",
    smsLiteRuleTemplatesSessionsEmpty: "Conecte primero un número SMS para usar esta automatización.",
    smsLiteRuleTemplatesSessionsChoose: "Elegir números…",
    smsLiteRuleTemplatesSessionsCountSelected: "{count} seleccionados",
    smsLiteRuleTemplatesNumberSearch: "Buscar números…",
    smsLiteRuleTemplatesNumberNoMatch: "Ningún número coincide con la búsqueda.",
    smsLiteRuleTemplatesActionSendText: "Enviar mensaje fijo por SMS",
    smsLiteRuleTemplatesSendTextLabel: "Texto del mensaje SMS",
    instagramLiteRuleTemplatesCreateTitle: "Crear automatización Instagram",
    instagramLiteRuleTemplatesEditTitle: "Editar automatización Instagram",
    instagramLiteTemplateFlowDragHint: "Arrastre para reordenar.",
    instagramLiteRuleTemplatesSessionsLabel: "Cuentas Instagram",
    instagramLiteRuleTemplatesSessionsHint: "Solo en cuentas seleccionadas.",
    instagramLiteRuleTemplatesSessionsEmpty: "Conecte primero una cuenta Instagram para usar esta automatización.",
    instagramLiteRuleTemplatesSessionsChoose: "Elegir cuentas…",
    instagramLiteRuleTemplatesSessionsCountSelected: "{count} seleccionadas",
    instagramLiteRuleTemplatesAccountSearch: "Buscar cuentas…",
    instagramLiteRuleTemplatesAccountNoMatch: "Ninguna cuenta coincide con la búsqueda.",
    instagramLiteRuleTemplatesActionSendText: "Enviar mensaje fijo por Instagram",
    instagramLiteRuleTemplatesSendTextLabel: "Texto del mensaje Instagram",
    instagramLiteRuleTemplatesWhenComment: "Comentario de Instagram en un post",
    instagramLiteRuleTemplatesWhenCommentAll: "Cualquier post (incluidos futuros)",
    instagramLiteRuleTemplatesWhenCommentSelected: "Posts seleccionados",
    instagramLiteRuleTemplatesCommentTextMatch: "Texto del comentario",
    instagramLiteRuleTemplatesCommentTextAny: "Cualquier texto de comentario",
    instagramLiteRuleTemplatesPostsBrowseAccount: "Buscar publicaciones de",
    instagramLiteRuleTemplatesPostsFilter: "Filtrar por descripción",
    instagramLiteRuleTemplatesPostsEmpty: "No se encontraron posts en esta cuenta.",
    instagramLiteRuleTemplatesPostsLoadMore: "Cargar más posts",
    instagramLiteRuleTemplatesActionReplyToComment: "Responder en el comentario",
    instagramLiteRuleTemplatesReplyLabel: "Texto de la respuesta",
    whatsappLiteRuleTemplatesActionCreateLead: "Crear lead en el CRM",
    whatsappLiteRuleTemplatesActionCreateContact: "Crear contacto",
    whatsappLiteRuleTemplatesActionStopFlow: "Finalizar flujo",
    whatsappLiteRuleTemplatesStopFlowHint:
      "Cierra este mensaje aquí. Las acciones después de esta no se ejecutan, y las automatizaciones siguientes no corren en esta ronda. Las acciones anteriores sí se ejecutan.",
    whatsappLiteRuleTemplatesCreateLeadSource: "Origen del lead (opcional)",
    whatsappLiteRuleTemplatesCreateLeadHint:
      "Crea una negociación (tarjeta CRM) en el proyecto, tablero y columna seleccionados. También crea o vincula un contacto del workspace con nombre, teléfono e identidad del canal. Si el binding de sesión ya auto-crea leads, usar ambos puede crear tarjetas duplicadas—prefiere uno u otro.",
    whatsappLiteRuleTemplatesCreateContactHint:
      "Crea o reutiliza un contacto del workspace a partir del teléfono o usuario de Instagram de esta conversación. Solo el nombre visible no basta para deduplicar contactos. No crea tarjeta de negociación en el CRM.",
    whatsappLiteRuleTemplatesSimulate: "Simular",
    whatsappLiteRuleTemplatesSimulateTitle: "Simulación (dry-run)",
    whatsappLiteRuleTemplatesSimMessage: "Mensaje entrante de ejemplo",
    whatsappLiteRuleTemplatesSimInbound: "N.º de mensajes entrantes del contacto",
    whatsappLiteRuleTemplatesSimSession: "Número de WhatsApp (opcional)",
    whatsappLiteRuleTemplatesSimOptionalNumber: "Cualquier número conectado",
    whatsappLiteRuleTemplatesSimNumberHint:
      "Déjelo en «cualquiera» salvo que necesite simular con una bandeja concreta.",
    whatsappLiteRuleTemplatesSimClearNumber: "Quitar selección",
    whatsappLiteRuleTemplatesNumberSearch: "Buscar números…",
    whatsappLiteRuleTemplatesNumberNoMatch: "Ningún número coincide con la búsqueda.",
    whatsappLiteRuleTemplatesSimMatched: "Coincidencia — índice de regla: {index}",
    whatsappLiteRuleTemplatesSimNotMatched: "Ninguna regla coincidió.",
    whatsappLiteRuleTemplatesSimRuleIndex: "Índice de regla",
    whatsappLiteRuleTemplatesDelete: "Eliminar automatización",
    whatsappLiteRuleTemplatesDeleteConfirm: "¿Eliminar esta automatización? El enrutamiento dejará de usarla.",
    whatsappLiteRuleTemplatesSaved: "Automatización guardada.",
    whatsappLiteRuleTemplatesCreated: "Automatización creada.",
    whatsappLiteRuleTemplatesWorkflowIntro:
      "Construye reglas de arriba a abajo: cuando un mensaje coincide, las acciones se ejecutan en orden. En el servidor gana la primera regla que coincida.",
    whatsappLiteRuleTemplatesRuleTitle: "Regla {n}",
    whatsappLiteRuleTemplatesRemoveRule: "Eliminar regla",
    whatsappLiteRuleTemplatesAddRule: "Añadir otra regla",
    whatsappLiteRuleTemplatesWhenLabel: "Cuándo (condición)",
    whatsappLiteRuleTemplatesWhenFirstInbound: "Primer mensaje del contacto en este chat",
    whatsappLiteRuleTemplatesWhenContains: "El texto contiene…",
    whatsappLiteRuleTemplatesWhenNotContains: "El texto no contiene…",
    whatsappLiteRuleTemplatesWhenRegex: "El texto coincide con una expresión regular",
    whatsappLiteRuleTemplatesWhenLlm: "El LLM clasifica el mensaje (avanzado)",
    whatsappLiteRuleTemplatesWhenLlmConversation: "IA clasifica la conversación (avanzado)",
    whatsappLiteRuleTemplatesWhenEventDateDaysAhead: "La fecha del evento / mudanza está a … días de hoy",
    whatsappLiteRuleTemplatesEventDateOpLabel: "Comparación",
    whatsappLiteRuleTemplatesEventDateDaysLabel: "Días",
    whatsappLiteRuleTemplatesEventDateMatchIfMissing: "También coincidir cuando no hay fecha en la conversación",
    whatsappLiteRuleTemplatesEventDateHint:
      "Extrae una fecha de la conversación (p. ej. fecha de mudanza) y compara días corridos desde hoy. Prefiere esto a pedirle a la IA que cuente los días.",
    whatsappLiteRuleTemplatesEventDateOpGt: "Más de (>)",
    whatsappLiteRuleTemplatesEventDateOpGte: "Al menos (≥)",
    whatsappLiteRuleTemplatesEventDateOpLt: "Menos de (<)",
    whatsappLiteRuleTemplatesEventDateOpLte: "Como máximo (≤)",
    whatsappLiteRuleTemplatesEventDateOpEq: "Exactamente (=)",
    whatsappLiteRuleTemplatesLlmConvPromptLabel: "Prompt de clasificación",
    whatsappLiteRuleTemplatesLlmConvPromptPlaceholder:
      "Describe lo que la IA debe buscar en la conversación, ej.: 'Clasificar si la conversación menciona presupuesto o solicitud de cotización'",
    whatsappLiteRuleTemplatesContainsPhrase: "Palabra o frase",
    whatsappLiteRuleTemplatesIgnoreCase: "Ignorar mayúsculas/minúsculas",
    whatsappLiteRuleTemplatesRegexPatternLabel: "Patrón regex",
    whatsappLiteRuleTemplatesLlmLabelsLabel: "Posibles clasificaciones (separadas por coma)",
    whatsappLiteRuleTemplatesLlmLabelsDesc:
      "Liste todas las clasificaciones posibles que la IA puede elegir, ej.: precio, soporte, queja, otro",
    whatsappLiteRuleTemplatesLlmResultsHint:
      "Cada clasificación tiene su propio camino. Lo que no coincida con ninguna usa En caso contrario.",
    whatsappLiteRuleTemplatesLlmAddResult: "Agregar clasificación",
    whatsappLiteRuleTemplatesLlmTopPath: "Camino de arriba",
    whatsappLiteRuleTemplatesLlmMatchLabel: "Clasificación que activa esta regla",
    whatsappLiteRuleTemplatesLlmMatchDesc:
      "Cuál de las clasificaciones anteriores debe activar las acciones de esta regla",
    whatsappLiteRuleTemplatesLlmHintLabel: "Contexto adicional para la IA (opcional)",
    whatsappLiteRuleTemplatesLlmHintDesc:
      "Instrucciones extra para ayudar a la IA a clasificar correctamente, ej.: 'Considere mensajes pidiendo precio como precio'",
    whatsappLiteRuleTemplatesActionsLabel: "Entonces (acciones)",
    whatsappLiteRuleTemplatesAddActionAgent: "+ Ejecutar agente",
    whatsappLiteRuleTemplatesAddActionMoveCard: "+ Mover tarjeta CRM vinculada",
    whatsappLiteRuleTemplatesRemoveAction: "Eliminar acción",
    whatsappLiteRuleTemplatesActionType: "Acción",
    whatsappLiteRuleTemplatesSendReply: "Enviar respuesta del agente a WhatsApp (si aplica)",
    whatsappLiteRuleTemplatesMoveProject: "Proyecto CRM (para listar columnas)",
    whatsappLiteRuleTemplatesMoveColumn: "Columna de destino",
    whatsappLiteRuleTemplatesPickProject: "Elige un proyecto…",
    whatsappLiteRuleTemplatesPickColumn: "Elige una columna…",
    whatsappLiteRuleTemplatesGroupSearch: "Buscar grupos…",
    whatsappLiteRuleTemplatesGroupNone: "Ninguno (responder al contacto)",
    whatsappLiteRuleTemplatesGroupNeedSession: "Activa primero un número de WhatsApp en esta automatización.",
    whatsappLiteRuleTemplatesChooseAgent: "Elegir agente",
    whatsappLiteRuleTemplatesPickAgent: "Elige un agente…",
    whatsappLiteRuleTemplatesAgentSearch: "Buscar agentes…",
    whatsappLiteRuleTemplatesActionSearch: "Buscar acciones…",
    whatsappLiteRuleTemplatesActionNoMatch: "Ninguna acción coincide con la búsqueda.",
    whatsappLiteRuleTemplatesAgentNoMatch: "Ningún agente coincide con la búsqueda.",
    whatsappLiteRuleTemplatesNoAgentsInWorkspace: "Aún no hay agentes en este workspace.",
    whatsappLiteRuleTemplatesEditorAdvanced: "Editar como JSON",
    whatsappLiteRuleTemplatesEditorVisual: "Volver al editor visual",
    whatsappLiteRuleTemplatesAdvancedHint: "Para condiciones anidadas o import JSON.",
    whatsappLiteRuleTemplatesAdvancedJson: "JSON en bruto de las reglas",
    whatsappLiteRuleTemplatesUnsupported:
      "Esta plantilla usa condiciones que el editor visual aún no admite. Corrige el JSON o simplifica las reglas.",
    whatsappLiteRuleTemplatesValidationRule: "Añade al menos una regla.",
    whatsappLiteRuleTemplatesValidationWhen: "Completa los campos de condición de cada regla.",
    whatsappLiteRuleTemplatesValidationWhenChatTypeOr:
      "“El chat es…” no se puede combinar con otras condiciones usando O — usa Y, o solo el tipo de chat.",
    whatsappLiteRuleTemplatesValidationWhenLlmRequiresPlan:
      "Las condiciones basadas en LLM no están disponibles en tu plan actual. Cambia la condición «cuándo» o mejora el plan para guardar.",
    whatsappLiteRuleTemplatesValidationAction:
      "Cada acción necesita los campos obligatorios: agente, columna, mensaje/plantilla o contenido de seguimiento con IA.",
    whatsappLiteRuleTemplatesActionExecuteAgent: "Ejecutar agente del workspace",
    whatsappLiteRuleTemplatesActionMoveCard: "Mover negociación vinculada",
    whatsappLiteRuleTemplatesActionCloneCard: "Copiar negociación a un tablero",
    whatsappLiteRuleTemplatesActionSendText: "Respuesta automática",
    whatsappLiteRuleTemplatesActionScheduleFollowup: "Programar mensajes de seguimiento",
    whatsappLiteRuleTemplatesActionAddLabel: "Agregar etiqueta a la tarjeta",
    whatsappLiteRuleTemplatesActionSetLeadSource: "Definir origen del lead",
    whatsappLiteRuleTemplatesActionTransitionState: "Cambiar estado de la conversación",
    whatsappLiteRuleTemplatesActionDisableAutoReply: "Bloquear respuesta automática",
    whatsappLiteRuleTemplatesActionEnableConversationAgent: "Activar agente de IA en la conversación",
    whatsappLiteRuleTemplatesDisableAutoReplyHint:
      "Pausa las respuestas automáticas de IA para este lead (atención humana). Se cancelan los follow-ups.",
    whatsappLiteRuleTemplatesEnableConversationAgentHint:
      "Define el agente de esta conversación en cada mensaje entrante (equivalente a /agent on en el chat). Puedes cambiarlo después en la inbox.",
    whatsappLiteRuleTemplatesActionDistributeLead: "Distribuir lead (CRM + responsable)",
    whatsappLiteRuleTemplatesActionAssignConversation: "Asignar conversación",
    whatsappLiteRuleTemplatesActionRouteToCrm: "Enrutar a columna CRM",
    whatsappLiteRuleTemplatesAssignUserOptional: "Asignar a (opcional)",
    whatsappLiteRuleTemplatesAssignUserPlaceholder: "Dejar vacío para distribución inteligente",
    whatsappLiteRuleTemplatesAssignUserHint:
      "Elige un miembro del equipo o usa distribución inteligente con las reglas de abajo.",
    whatsappLiteRuleTemplatesAssignUserRoundRobin: "Distribución inteligente (reglas abajo)",
    whatsappLiteRuleTemplatesAssignUserSearch: "Buscar miembros…",
    whatsappLiteRuleTemplatesLabelText: "Nombre de la etiqueta",
    whatsappLiteRuleTemplatesLabelTextPlaceholder: "ej.: Presupuesto, VIP, Urgente…",
    whatsappLiteRuleTemplatesLabelColor: "Color de la etiqueta",
    whatsappLiteRuleTemplatesLeadSourceText: "Nombre del origen del lead",
    whatsappLiteRuleTemplatesLeadSourcePlaceholder: "ej.: WhatsApp Inbound, Referencia…",
    whatsappLiteRuleTemplatesTransitionStateLabel: "Estado objetivo",
    whatsappLiteRuleTemplatesTransitionStateStopsAutoReply:
      "Este estado detendrá las respuestas automáticas de IA para este lead.",
    whatsappLiteConvStateNewLead: "Nuevo lead",
    whatsappLiteConvStateQualifying: "Calificando",
    whatsappLiteConvStateWaitingResponse: "Esperando respuesta",
    whatsappLiteConvStateNegotiating: "Negociando",
    whatsappLiteConvStateHumanHandoff: "Atención humana (detiene auto-respuesta)",
    whatsappLiteConvStateFollowup: "Seguimiento",
    whatsappLiteConvStateWon: "Ganado",
    whatsappLiteConvStateLost: "Perdido",
    whatsappLiteConvStateBlocked: "Bloqueado",
    whatsappLiteConvStateIdle: "Inactivo",
    whatsappLiteRuleTemplatesFollowupMessages: "Mensajes de seguimiento",
    whatsappLiteRuleTemplatesFollowupMessagesHint: "Un mensaje por paso (se permiten espacios).",
    whatsappLiteRuleTemplatesAddActionSendText: "+ Enviar mensaje fijo",
    whatsappLiteRuleTemplatesAddActionFollowup: "+ Programar seguimientos",
    whatsappLiteRuleTemplatesSendTextLabel: "Texto del mensaje",
    whatsappLiteRuleTemplatesSendTextHint: "Se envía como texto simple cuando la regla coincide (sin IA).",
    whatsappLiteRuleTemplatesSendTextChainHint:
      "Para varios mensajes seguidos (1.ª respuesta, 2.ª respuesta, …), pulse «Añadir paso» (+) y elija «Enviar mensaje fijo» de nuevo. Los pasos se ejecutan de izquierda a derecha.",
    whatsappLiteRuleTemplatesConditionLabel: "Condición",
    whatsappLiteRuleTemplatesConditionAndHint: "Todas las condiciones deben cumplirse (Y).",
    whatsappLiteRuleTemplatesWhenSearch: "Buscar condiciones…",
    whatsappLiteRuleTemplatesWhenNoMatch: "No se encontraron condiciones.",
    whatsappLiteTemplateFlowAddCondition: "Condición",
    whatsappLiteTemplateFlowAddActionMenu: "Acción",
    whatsappLiteTemplateFlowEndTitle: "Añadir",
    whatsappLiteTemplateFlowDragHint:
      "Arrastre condiciones y acciones para reordenar. Use + entre pasos para añadir una condición.",
    whatsappLiteTemplateFlowInspectorTitle: "Detalle del paso",
    whatsappLiteTemplateFlowInspectorEmpty: "Selecciona un paso en el flujo.",
    whatsappLiteTemplateFlowTabFlow: "Flujo visual",
    whatsappLiteTemplateFlowTabJson: "JSON",
    whatsappLiteTemplateFlowRulesSidebar: "Reglas",
    whatsappLiteTemplateFlowNodeTriggerHeader: "Disparador (cuándo)",
    whatsappLiteTemplateFlowTriggerEvent: "Evento",
    whatsappLiteTemplateFlowTriggerInbound: "Mensaje recibido",
    whatsappLiteTemplateFlowTriggerSent: "Mensaje enviado (humano o agente de la conversación)",
    whatsappLiteTemplateFlowTriggerTemplateSent: "Plantilla enviada",
    whatsappLiteTemplateFlowTriggerComment: "Comentario recibido",
    whatsappLiteTemplateFlowCommentTriggerHint:
      "Esto ya corre cuando alguien comenta. Agrega una condición solo si quieres un filtro extra, como el texto del comentario. Elige los posts abajo.",
    whatsappLiteTemplateFlowAddBranch: "Agregar ramificación",
    whatsappLiteTemplateFlowTriggerTextOp: "Filtro de texto",
    whatsappLiteTemplateFlowTriggerTextContains: "Contiene",
    whatsappLiteTemplateFlowTriggerTextNotContains: "No contiene",
    whatsappLiteTemplateFlowTriggerTextNone: "Cualquier texto",
    whatsappLiteTemplateFlowTriggerInspectorHint:
      "Esta tarjeta es el Evento seleccionado arriba. Añada filtros de texto y otras condiciones en el lienzo — no en el encabezado.",
    whatsappLiteTemplateFlowInsertCondition: "Añadir condición aquí",
    whatsappLiteTemplateFlowBranchYes: "Sí",
    whatsappLiteTemplateFlowBranchNo: "No",
    whatsappLiteTemplateFlowOtherwise: "En caso contrario",
    whatsappLiteTemplateFlowOtherwiseHint:
      "En caso contrario se ejecuta cuando esta condición no se cumple. Un clasificador tiene un camino por etiqueta, y lo que sobre usa En caso contrario.",
    whatsappLiteTemplateFlowNodeConditionHeader: "Condición {n}",
    whatsappLiteTemplateFlowNodeActionHeader: "Acción {n} (paso)",
    whatsappLiteTemplateFlowConfigValid: "Configuración válida",
    whatsappLiteTemplateFlowConfigIncomplete: "Requiere configuración",
    whatsappLiteTemplateFlowCloseInspector: "Cerrar panel del paso",
    whatsappLiteDelayUnitMinutes: "Minutos",
    whatsappLiteDelayUnitHours: "Horas",
    whatsappLiteDelayUnitDays: "Días",
    whatsappLiteDelayUnitWeeks: "Semanas",
    whatsappLiteDelayUnitMonths: "Meses",
    whatsappLiteSlaTitle: "SLA de Tiempo de Respuesta",
    whatsappLiteSlaDescription: "Configure umbrales de advertencia y crítico para conversaciones sin responder.",
    whatsappLiteSlaEnabled: "Activar monitoreo de SLA",
    whatsappLiteSlaWarning: "Advertencia después de",
    whatsappLiteSlaCritical: "Crítico después de",
    whatsappLiteSlaMinutes: "min",
    whatsappLiteSlaSaved: "Configuración de SLA guardada.",
    whatsappLiteSlaDefault: "Por defecto",
    whatsappLiteSlaAddColumn: "Añadir regla por columna",
    whatsappLiteSlaProject: "Proyecto",
    whatsappLiteSlaColumn: "Columna",
    whatsappLiteSlaRemoveRule: "Eliminar",
    whatsappLiteSlaColumnRules: "Reglas por columna",
    whatsappLiteOutboundNamePrefixTitle: "Nombre del agente en los mensajes",
    whatsappLiteOutboundNamePrefixDescription:
      "Añade automáticamente el nombre del agente en negrita al inicio de cada mensaje saliente.",
    whatsappLiteOutboundNamePrefixEnabled: "Incluir nombre del agente en los mensajes",
    whatsappLiteOutboundNamePrefixSaved: "Configuración de mensajes guardada.",
    whatsappLiteLinkedLeadInboxTitle: "Solo conversaciones con lead",
    whatsappLiteLinkedLeadInboxDescription:
      "Oculta en el inbox y en la lista del número las conversaciones que no están vinculadas a una tarjeta.",
    whatsappLiteLinkedLeadInboxEnabled: "Ocultar conversaciones sin tarjeta",
    whatsappLiteLinkedLeadInboxSaved: "Configuración de mensajes guardada.",
    messagingSlaTitle: "SLA de Tiempo de Respuesta",
    messagingSlaDescription: "Configure umbrales de advertencia y crítico para conversaciones sin responder.",
    messagingSlaDefault: "Por defecto",
    messagingSlaWarning: "Advertencia después de",
    messagingSlaCritical: "Crítico después de",
    messagingSlaMinutes: "min",
    messagingSlaColumnRules: "Reglas por columna",
    messagingSlaAddColumn: "Añadir regla por columna",
    messagingSlaProject: "Proyecto",
    messagingSlaColumn: "Columna",
    messagingSlaRemoveRule: "Eliminar",
    messagingSlaSaved: "Configuración de SLA guardada.",
    messagingOutboundNamePrefixTitle: "Nombre del agente en los mensajes",
    messagingOutboundNamePrefixDescription:
      "Añade automáticamente el nombre del agente al inicio de cada mensaje saliente.",
    messagingOutboundNamePrefixEnabled: "Incluir nombre del agente en los mensajes",
    messagingOutboundNamePrefixSaved: "Configuración de mensajes guardada.",
    blastCampaignsTab: "Campañas",
    blastCampaignsTitle: "Campañas Masivas",
    blastCampaignsDescription: "Envíe mensajes secuenciales a múltiples contactos",
    blastCampaignsCreate: "Nueva Campaña",
    blastCampaignsEmpty: "Aún no hay campañas. Cree una para comenzar.",
    blastCampaignCreated: "Campaña creada",
    blastCampaignName: "Nombre de la campaña",
    blastCampaignDescription: "Descripción (opcional)",
    blastCampaignSession: "Número de WhatsApp",
    blastCampaignSelectSession: "Selecciona el número…",
    blastCampaignDailyLimit: "Límite diario",
    blastCampaignInterval: "Intervalo (seg)",
    blastCampaignCustomInterval: "Usar intervalo personalizado",
    blastCampaignCustomIntervalHint: "Milisegundos entre cada mensaje. Mínimo 50, máximo 5000.",
    blastCampaignIntervalMs: "Intervalo (ms)",
    blastCampaignIntervalInvalid: "El intervalo debe estar entre 50 y 5000 milisegundos.",
    blastCampaignSecondsIntervalInvalid: "El intervalo debe estar entre 5 y 3600 segundos.",
    blastCampaignIntervalNeedsSession: "Selecciona el número para definir el intervalo.",
    blastCampaignEstimatedDuration: "Duración estimada: {duration}",
    blastCampaignEstimatedLeft: "cerca de {duration} restantes",
    blastCampaignDurationSeconds: "{count} s",
    blastCampaignDurationMinutes: "{count} min",
    blastCampaignDurationHours: "{count} h",
    blastCampaignDurationDays: "{count} d",
    blastCampaignAudience: "Fuente de audiencia",
    blastCampaignAudienceManual: "Manual (agregar después)",
    blastCampaignAudienceProject: "Desde proyecto",
    blastCampaignAudienceCsv: "Subir CSV",
    blastCampaignCsvUpload: "Subir lista de teléfonos",
    blastCampaignCsvChooseFile: "Elegir archivo",
    blastCampaignCsvPhoneCount: "teléfono(s) encontrado(s)",
    blastCampaignCsvRequired: "Suba un archivo CSV con números de teléfono.",
    blastCampaignAudienceProjectLabel: "Proyecto",
    blastCampaignAudienceBoardLabel: "Tablero",
    blastCampaignAudienceColumnLabel: "Columna",
    blastCampaignAudienceCardFiltersHint: "Opcional. Mismos filtros que el tablero.",
    blastCampaignSequence: "Secuencia de Mensajes",
    blastCampaignAddStep: "Agregar paso",
    blastCampaignStep: "Paso",
    blastCampaignSteps: "pasos",
    blastCampaignSent: "enviados",
    blastCampaignDelay: "Retraso (horas)",
    blastCampaignMessagePlaceholder: "Contenido del mensaje...",
    blastCampaignSkipIfReplied: "Omitir si ya respondió",
    blastCampaignTransportBaileys: "Baileys",
    blastCampaignTransportCloud: "Meta Cloud API",
    blastCampaignStepMode: "Tipo de mensaje",
    blastCampaignStepModeFreeform: "Mensaje libre",
    blastCampaignStepModeTemplate: "Plantilla",
    blastCampaignTemplate: "Plantilla",
    blastCampaignSelectTemplate: "Selecciona una plantilla",
    blastCampaignNoTemplates: "No hay plantillas disponibles para este número.",
    blastCampaignTemplateRequired: "Selecciona una plantilla para cada paso de plantilla.",
    blastCampaignCloudTemplateOnlyHint:
      "Los números Cloud API solo pueden enviar plantillas aprobadas por Meta en campañas.",
    blastCampaignTemplateVars: "Variables",
    blastCampaignVarCrmField: "Campo del CRM",
    blastCampaignVarCrmFieldManual: "Solo manual / predeterminado",
    blastCampaignVarDefault: "Valor predeterminado",
    blastCampaignVarDefaultPlaceholder: "Se usa cuando el campo del CRM está vacío",
    blastCampaignTemplatePreview: "Vista previa",
    blastCampaignCrmFieldTitle: "Título de la tarjeta",
    blastCampaignCrmFieldContactName: "Nombre del contacto",
    blastCampaignCrmFieldEmail: "Correo",
    blastCampaignCrmFieldPhone: "Teléfono",
    blastCampaignCrmFieldCompany: "Empresa",
    blastCampaignCrmFieldRole: "Cargo",
    blastCampaignCrmFieldIndustry: "Sector",
    blastCampaignCrmFieldEstimateRevenue: "Ingresos estimados",
    blastCampaignCrmFieldMessage: "Mensaje",
    blastCampaignStart: "Iniciar",
    blastCampaignPause: "Pausar",
    blastCampaignCancel: "Cancelar",
    blastCampaignNameRequired: "El nombre es obligatorio",
    blastCampaignSessionRequired: "El número de WhatsApp es obligatorio",
    blastCampaignStepRequired: "Se requiere al menos un paso de mensaje",
    blastCampaignDailyLimitInvalid: "El límite diario debe ser un número positivo",
    blastCampaignDeleteConfirm: "Esto eliminará permanentemente esta campaña. Esta acción no se puede deshacer.",
    blastCampaignEdit: "Editar campaña",
    blastCampaignEditTitle: "Editar campaña",
    blastCampaignSave: "Guardar cambios",
    blastCampaignUpdated: "Campaña actualizada",
    blastCampaignEditLimitedHint: "Ya hay mensajes enviados. Solo nombre, descripción, límite e intervalo.",
    blastCampaignPostSendTitle: "Después de enviar a cada lead",
    blastCampaignPostSendHint: "Requiere tarjeta CRM vinculada.",
    blastCampaignPostSendEnable: "Mover tarjeta del lead a una columna",
    blastCampaignPostSendProject: "Proyecto CRM",
    blastCampaignPostSendBoard: "Board",
    blastCampaignPostSendColumn: "Columna de destino",
    blastCampaignPostSendSelectProject: "Seleccionar proyecto…",
    blastCampaignPostSendSelectColumn: "Seleccionar columna…",
    blastCampaignPostSendColumnsLoading: "Cargando columnas…",
    blastCampaignPostSendColumnRequired: "Elija la columna de destino para la acción posterior al envío.",
    blastCampaignPostSendCrmAudienceHint: "Solo para leads con tarjeta CRM.",
    blastCampaignPostSendSummary: "mueve tarjeta tras envío",
    blastCampaignFailed: "fallaron",
    blastCampaignRetryFailed: "Reintentar fallidos",
    blastCampaignViewFailures: "Ver contactos fallidos",
    blastCampaignFailuresDialogTitle: "Contactos fallidos",
    blastCampaignFailuresDialogSubtitle:
      "Vea por qué falló cada envío, reinténtelo o mueva la tarjeta del contacto a otra columna.",
    blastCampaignRetryOne: "Reintentar",
    blastCampaignRetryOneSuccess: "Contacto puesto en cola para reintento",
    blastCampaignMoveContact: "Mover a columna",
    blastCampaignMoveContactConfirm: "Mover",
    blastCampaignMoveContactSuccess: "Tarjeta movida",
    blastCampaignNoLinkedCard: "Sin tarjeta vinculada para mover",
    blastCampaignFailedReasonUnknown: "Error desconocido",
    blastCampaignMoveAllFailed: "Mover los {count} contactos fallidos a una columna",
    blastCampaignMoveAllFailedSuccess: "{count} tarjeta(s) movida(s)",
    blastCampaignMoveAllFailedPartial: "{moved} tarjeta(s) movida(s), {failed} fallaron",
    blastCampaignAttachmentsHint:
      "Varios archivos se envían como mensajes de WhatsApp separados (máx. {count} por paso, 20 MB cada uno).",
    blastCampaignAddAttachment: "Subir archivo",
    blastCampaignFromLibrary: "Desde biblioteca",
    blastCampaignAttachmentMax: "Máximo {count} adjuntos por paso",
    blastCampaignAttachmentTooLarge: "El archivo supera el límite de 20 MB para envío en WhatsApp",
    blastCampaignAttachmentInvalidType: "Tipo de archivo no permitido en campañas blast",
    blastCampaignAttachmentDropHint: "Arrastra archivos aquí o usa el botón de adjunto",
    blastCampaignAttachmentUploading: "Subiendo…",
    blastCampaignAttachmentUploadFailed: "Error al subir",
    workspaceNameRequired: "El nombre del workspace es obligatorio",
    workspaceDetailsUpdated: "Detalles del workspace actualizados exitosamente",
    businessHoursTitle: "Horario de atención",
    businessHoursDescription:
      "Define cuándo está disponible el equipo. Se usa en reglas inbound de WhatsApp y otras automatizaciones.",
    businessHoursEnabled: "Activar horario de atención",
    businessHoursTimezone: "Zona horaria",
    businessHoursAddWindow: "Añadir franja horaria",
    businessHoursRemoveWindow: "Eliminar",
    businessHoursStart: "Desde",
    businessHoursEnd: "Hasta",
    businessHoursSaved: "Horario de atención guardado",
    businessHoursMonday: "Lunes",
    businessHoursTuesday: "Martes",
    businessHoursWednesday: "Miércoles",
    businessHoursThursday: "Jueves",
    businessHoursFriday: "Viernes",
    businessHoursSaturday: "Sábado",
    businessHoursSunday: "Domingo",
    whatsappLiteRuleTemplatesWhenWithinBusinessHours: "Dentro del horario de atención",
    whatsappLiteRuleTemplatesWhenOutsideBusinessHours: "Fuera del horario de atención",
    whatsappLiteRuleTemplatesWhenChatType: "El chat es…",
    whatsappLiteRuleTemplatesDirectOnlyHint:
      'Esta regla no tiene una condición de "Tipo de chat", por lo que solo se aplica a mensajes directos — nunca se activará en grupos. Agrega una condición de "Tipo de chat" para incluir grupos.',
    whatsappLiteRuleTemplatesWhenChatTypeDirect: "Directo (1:1)",
    whatsappLiteRuleTemplatesWhenChatTypeGroup: "Grupo",
    whatsappLiteRuleTemplatesWhenChatTypeAny: "Directo o grupo",
    whatsappLiteRuleTemplatesWhenChatTypeHint:
      "Combínalo con otras condiciones (Y) para automatizaciones solo de grupo o solo directas. Las reglas sin esta condición siguen siendo solo directas.",
    whatsappLiteRuleTemplatesWhenChatTypeDisabled:
      "Las condiciones de grupo están desactivadas mientras “Ocultar mensajes de grupo” esté activado.",
    whatsappLiteRuleTemplatesWhenFromGroup: "El mensaje es de grupo(s)",
    whatsappLiteRuleTemplatesWhenFromGroupMode: "Coincide con",
    whatsappLiteRuleTemplatesWhenFromGroupLabel: "Grupo(s)",
    whatsappLiteRuleTemplatesWhenFromGroupHint:
      "Coincide cuando el grupo del mensaje entrante es uno de los seleccionados.",
    whatsappLiteRuleTemplatesWhenFromPhone: "El mensaje es de número(s) de teléfono",
    whatsappLiteRuleTemplatesWhenFromPhoneMode: "Coincide con",
    whatsappLiteRuleTemplatesWhenFromPhoneLabel: "Número(s) de teléfono / contacto(s)",
    whatsappLiteRuleTemplatesWhenFromAd: "Vino de un anuncio (Click-to-WhatsApp)",
    whatsappLiteRuleTemplatesWhenFromAdHint:
      "Solo los números conectados por la API oficial de WhatsApp reciben el anuncio que trajo al contacto.",
    whatsappLiteRuleTemplatesWhenFromAdMatch: "Qué anuncios",
    whatsappLiteRuleTemplatesWhenFromAdAny: "Cualquier anuncio",
    whatsappLiteRuleTemplatesWhenFromAdIds: "Anuncios específicos (IDs)",
    whatsappLiteRuleTemplatesWhenFromAdCampaigns: "La campaña es (IDs de campaña)",
    whatsappLiteRuleTemplatesWhenFromAdCampaignsHint:
      "Requiere la integración Meta Ads en el proyecto del lead (los IDs de campaña están en el Administrador de anuncios).",
    whatsappLiteRuleTemplatesWhenFromAdHeadline: "El título del anuncio contiene",
    whatsappLiteRuleTemplatesWhenFromAdScope: "Se aplica a",
    whatsappLiteRuleTemplatesWhenFromAdScopeMessage: "El mensaje enviado desde el anuncio",
    whatsappLiteRuleTemplatesWhenFromAdScopeConversation: "Cualquier mensaje de un chat que vino de un anuncio",
    whatsappLiteRuleTemplatesAdTokensHint:
      "Los campos del anuncio se rellenan cuando el chat vino de un anuncio Click-to-WhatsApp; si no, quedan vacíos.",
    whatsappLiteRuleTemplatesWhenFromPhoneHint:
      "Separados por comas. Cualquier formato funciona — solo se comparan los dígitos.",
    whatsappLiteRuleTemplatesWhenModeIn: "Es uno de",
    whatsappLiteRuleTemplatesWhenModeNotIn: "No es ninguno de",
    whatsappLiteRuleTemplatesActionSendToRecipients: "Enviar mensaje a contactos",
    whatsappLiteRuleTemplatesRecipients: "Destinatarios",
    whatsappLiteRuleTemplatesRecipientAssignee: "Responsable de la tarjeta",
    whatsappLiteRuleTemplatesRecipientReporter: "Creador de la tarjeta",
    whatsappLiteRuleTemplatesRecipientCardHint:
      "Solo se resuelve cuando esta conversación está vinculada a una tarjeta del CRM.",
    whatsappLiteRuleTemplatesRecipientUsers: "Usuarios del workspace",
    whatsappLiteRuleTemplatesRecipientUsersPlaceholder: "Seleccionar usuarios",
    whatsappLiteRuleTemplatesRecipientUsersSearch: "Buscar usuarios…",
    whatsappLiteRuleTemplatesRecipientCustomPhones: "Números de teléfono personalizados",
    whatsappLiteRuleTemplatesRecipientGroups: "Grupo(s)",
    whatsappLiteRuleTemplatesRecipientGroupsHint: "Selecciona uno o más grupos de WhatsApp para notificar.",
    whatsappLiteBindingAllowGroupAutoReply: "También responder automáticamente en grupos",
    whatsappLiteBindingAllowGroupAutoReplyHint:
      "Opcional. Elige todos los grupos de este número, o selecciona grupos específicos. Solo controla la auto-respuesta del agente — no oculta grupos de la bandeja. Requiere “Mostrar mensajes de grupo en la bandeja” activado.",
    whatsappLiteBindingGroupsPickRequired: "Selecciona al menos un grupo, o cambia a “todos los grupos”.",
    whatsappLiteBindingAllowGroupAll: "Todos los grupos de este número",
    whatsappLiteBindingAllowGroupPick: "Solo grupos seleccionados",
    whatsappLiteBindingGroupsEmpty: "Aún no hay grupos para este número. Abre la bandeja después de unirte a grupos.",
    whatsappLiteBindingGroupsDisabled:
      "Activa “Mostrar mensajes de grupo en la bandeja” para configurar auto-reply en grupos.",
    whatsappLiteBindingGroupsLoading: "Cargando configuración de la bandeja…",
    whatsappLiteRuleTemplatesSimChatType: "Simular como…",
    whatsappLiteInboxHideGroupsAutomationHint:
      "Si los grupos están ocultos en la configuración de la bandeja, las automatizaciones y el auto-reply de grupo quedan bloqueados — aunque estuvieran habilitados.",
    failedToUpdateWorkspace: "Error al actualizar detalles del workspace",

    letterheadTitle: "Membrete (Letterhead)",
    letterheadDescription: "Configura el encabezado y pie de página para los PDF generados por el agente.",
    letterheadEnabled: "Activar membrete en los PDF",
    letterheadEnabledHint: "Cuando está activo, los PDF generados por el agente usan este encabezado y pie.",
    letterheadCompanyName: "Nombre de la empresa",
    letterheadCompanyNamePlaceholder: "Nombre de la empresa para el encabezado",
    letterheadLogo: "Logo",
    letterheadLogoUpload: "Subir logo",
    letterheadLogoUploading: "Subiendo…",
    letterheadLogoRemove: "Quitar logo",
    letterheadLogoHint: "PNG o JPG. El logo subido se almacena y se usa en los PDF generados.",
    letterheadPrimaryColor: "Color principal",
    letterheadInvalidColor: "Color principal inválido. Usa formato hexadecimal (#000000).",
    letterheadHeaderLayout: "Diseño del encabezado",
    letterheadLayoutLeft: "Izquierda (logo + nombre lado a lado)",
    letterheadLayoutCenter: "Centrado",
    letterheadLayoutMinimal: "Minimalista (sin bordes)",
    letterheadFooterText: "Texto del pie",
    letterheadFooterPlaceholder: "CIF: …, Tel: …, email@empresa.com",
    letterheadFooterHint: "Aparece en el pie de todos los PDF generados.",
    letterheadSaved: "Membrete guardado correctamente.",
    letterheadSaveError: "Error al guardar el membrete.",

    documentTemplatesTitle: "Plantillas de documentos",
    documentTemplatesDescription:
      "Sube plantillas .docx o .html con placeholders para que el agente las complete automáticamente.",
    documentTemplatesAdd: "Añadir",
    documentTemplatesName: "Nombre de la plantilla",
    documentTemplatesNamePlaceholder: "Ej: Informe de horas de soporte",
    documentTemplatesDescriptionOptional: "Descripción (opcional)",
    documentTemplatesDescriptionPlaceholder: "Breve descripción de la plantilla",
    documentTemplatesCategory: "Categoría",
    documentTemplatesCategoryInvoice: "Factura",
    documentTemplatesCategoryReport: "Informe",
    documentTemplatesCategoryProposal: "Propuesta",
    documentTemplatesCategorySupportHours: "Horas de soporte",
    documentTemplatesCategoryContract: "Contrato",
    documentTemplatesCategoryOther: "Otro",
    documentTemplatesFile: "Archivo .docx o .html",
    documentTemplatesSelectFile: "Seleccionar archivo",
    documentTemplatesPlaceholderHint:
      'Word: {placeholder}. HTML: data-slot="name" (o {{name}}) para campos que el agente debe completar.',
    documentTemplatesUpload: "Subir plantilla",
    documentTemplatesUploading: "Subiendo…",
    documentTemplatesUploadSuccess: "¡Plantilla subida correctamente!",
    documentTemplatesUploadError: "Error al subir la plantilla",
    documentTemplatesUploadValidation: "Escribe un nombre y selecciona un archivo .docx o .html",
    documentTemplatesDeleteSuccess: "Plantilla eliminada",
    documentTemplatesDeleteError: "Error al eliminar la plantilla",
    documentTemplatesLoading: "Cargando plantillas…",
    documentTemplatesEmpty: "No hay plantillas",
    documentTemplatesEmptyHint: "Sube un archivo .docx o .html para que el agente lo use como modelo.",
    documentTemplatesFields: "Campos",
    documentTemplatesKindHtml: "HTML",
    documentTemplatesKindDocx: "Word",

    whatsappLiteBindingAutoReplyScope: "Chats con auto-respuesta",
    whatsappLiteBindingAutoReplyScopeHint: "Elige si el agente responde en chats directos, grupos o ambos.",
    whatsappLiteBindingAutoReplyScopeDirect: "Solo chats directos",
    whatsappLiteBindingAutoReplyScopeGroup: "Solo grupos",
    whatsappLiteBindingAutoReplyScopeBoth: "Chats directos y grupos",

    // Danger zone
    dangerZone: "Zona de Peligro",
    deleteWorkspace: "Eliminar mi workspace",
    permanentlyDeleteWorkspace: "Eliminar permanentemente el workspace",
    changeWorkspaceLogo: "Cambiar logo del workspace",
    workspaceLogoAlt: "Logo del workspace",
    customBrandingTitle: "Color de la barra lateral",
    customBrandingDescription:
      "Define el color de acento del degradado de la barra lateral. Elige cualquier color o usa el predeterminado para mantener el tema JSYNQ.",
    customBrandingEnabled: "Usar identidad visual personalizada",
    customBrandingEnabledHint: "Aplica el color de acento elegido al degradado de la barra lateral.",
    customBrandingSidebarColor: "Color de acento",
    customBrandingSidebarColorHint: "Este color se mezcla en la barra lateral de arriba hacia abajo.",
    customBrandingUseDefaultColor: "Usar predeterminado",
    customBrandingColorStyle: "Estilo",
    customBrandingColorStyleGradient: "Degradado",
    customBrandingColorStyleSolid: "Sólido",
    customBrandingLogoHint:
      "El logo del workspace se gestiona en Ajustes del workspace — aparece en la barra lateral cuando hay un color de acento personalizado.",
    customBrandingSaved: "Color de la barra lateral guardado",
    customBrandingInvalidColor: "Introduce un color hexadecimal válido (p. ej. #45AD7E)",

    // General
    createdAt: "Creado en",

    // Delete modal
    confirmAction: "Confirmar acción",
    deleteWorkspaceWarning:
      "Si eliminas tu workspace, perderás permanentemente tu perfil, proyectos, documentos y todo el trabajo realizado.",
    deleteWorkspaceConfirmation:
      "¿Estás seguro de que quieres eliminar {workspaceName}? Esta acción no se puede deshacer.",
    typeDeleteToConfirm: "Escribe DELETE para confirmar",
    deleteWorkspaceButton: "Eliminar Workspace",

    // Sidebar
    backToWorkspace: "Volver al workspace",
    billing: "Facturación",
    settings: "Configuraciones",
    account: "Cuenta",
    members: "Miembros",
    integrations: "Integraciones",
    oauthApps: "Apps OAuth",
    agentDigestNav: "Resumen del agente",
    calendarAccessGoogleNotConnected: "Ningún Google Calendar conectado en este workspace.",
    calendarAccessGoogleCalendarsHint: "También leer eventos de la cuenta Google conectada.",
    calendarAccessGoogleCalendarsTitle: "Incluir Google Calendars conectados",
    calendarAccessLoadingMore: "Cargando más…",
    calendarAccessEmptyResults: "Sin coincidencias.",
    calendarAccessSearchPlaceholder: "Buscar…",
    calendarAccessSelectedCountTemplate: "{{count}} seleccionados",
    calendarAccessPickUsers: "Buscar y seleccionar miembros del workspace",
    calendarAccessScopeUsersDescription: "Elige de qué miembros del workspace el agente puede ver las reuniones.",
    calendarAccessScopeUsersTitle: "Personas específicas",
    calendarAccessScopeWorkspaceDescription: "Reuniones de todos los miembros del workspace.",
    calendarAccessScopeWorkspaceTitle: "Todo el workspace",
    calendarAccessScopeOwnerDescription: "Solo las reuniones del dueño del agente.",
    calendarAccessScopeOwnerTitle: "Solo el mío",
    calendarAccessScopeLabel: "Calendario de quién",
    calendarAccessCanScheduleHint: "Verificar horarios libres/ocupados y crear, editar o cancelar reuniones.",
    calendarAccessCanScheduleTitle: "Verificar disponibilidad y agendar",
    calendarAccessCanListHint: "Administrativo — ver y enumerar detalles de reuniones existentes.",
    calendarAccessCanListTitle: "Listar reuniones",
    calendarAccessEnabledHint: "Sin esto, el agente no tiene ningún acceso a reuniones o calendarios.",
    calendarAccessEnabledTitle: "Activar herramientas de calendario",
    whatsappLiteBindingCalendarAccessOverrideHint:
      "Usar permisos de calendario específicos de esta automatización en lugar de la configuración del propio agente.",
    whatsappLiteBindingCalendarAccessOverride: "Sustituir aquí el acceso al calendario del agente",
    mcpConnections: "Conexiones MCP",

    // Billing
    planDetails: "Detalles del plan",
    activeMembers: "Actualmente tienes {count} {memberText} activo(s) en tu workspace.",
    member: "miembro",
    daysLeftInTrial: "({days} {dayText} restante(s) en el trial)",
    day: "día",
    days: "días",
    currentPlan: "Plan actual",
    addPaymentMethod: "Agregar método de pago",
    managePlan: "Gestionar plan",
    contactSupportToSwitchPlans: "Contacta con soporte para cambiar a este plan",
    switchPlan: "Cambiar a este plan",
    switchPlanConfirmTitle: "¿Cambiar de plan?",
    switchPlanConfirmDescription:
      "Estás a punto de cambiar a {plan}. La diferencia de precio se prorrateará y se cobrará o acreditará de inmediato.",
    switchPlanSuccess: "Plan cambiado con éxito.",
    switchPlanError: "Algo salió mal al cambiar de plan.",
    switching: "Cambiando...",
    confirm: "Confirmar",
    downgradeInDevelopment: "Downgrade en desarrollo...",
    upgradeTo: "Upgrade a {plan} {interval}",
    downgradeTo: "Downgrade a {plan} {interval}",
    startTrial: "Iniciar trial",
    oneTrialPerWorkspace: "* Un trial por workspace. Sin reactivación después de que termine.",
    startTrialModalTitle: "Comienza tu trial gratuito de 14 días y desbloquea todo el potencial de JSYNQ.",
    startTrialModalSubtitle:
      "Reduce el trabajo repetitivo y aumenta la colaboración para maximizar el impacto de tu equipo",
    startTrialModalFeaturesHeading: "Desbloquea todas las funciones de JSYNQ Pro:",
    startTrialModalFeatureAiIntegration: "Integración con IA",
    startTrialModalFeatureUnlimitedProjects: "Proyectos ilimitados",
    startTrialModalFeaturePeoplePerMeeting: "100 personas por reunión",
    startTrialModalFeaturePrivateTasks: "Tareas privadas",
    startTrialModalFeatureUnlimitedRoles: "Roles ilimitados",
    startTrialModalFeatureMeetingTranscripts: "Transcripción de reuniones",
    startTrialModalFeatureJsynqAi: "JSYNQ AI",
    startTrialModalFeaturePrioritySupport: "Soporte prioritario",
    startTrialModalFeatureAndMore: "Y mucho más",
    startTrialModalFeatureTimeInsights: "Estadísticas avanzadas de tiempo",
    startTrialModalCancel: "Cancelar",
    startTrialModalViewPlans: "Ver planes",
    startTrialModalStartFreeTrial: "Iniciar trial gratuito",
    startTrialModalPaymentTitle: "Agrega un método de pago",
    startTrialModalPaymentSubtitle: "No se te cobrará hasta que termine tu trial de 14 días. Cancela cuando quieras.",
    startTrialModalPaymentCardLabel: "Datos de la tarjeta",
    startTrialModalBack: "Atrás",
    startTrialModalConfirmStartTrial: "Iniciar trial gratuito",
    startTrialModalSuccessTitle: "Tu trial gratuito ha comenzado",
    startTrialModalSuccessSubtitle: "Ahora tienes 14 días de acceso completo a todas las funciones pagas.",
    startTrialModalGotIt: "¡Entendido!",
    startTrialModalGenericError: "Algo salió mal. Por favor, intenta de nuevo.",
    perUserPerMonth: "por usuario/mes",
    perWorkspacePerMonth: "por workspace/mes",
    flatRateForTeam: "Tarifa fija para tu equipo ({seats} asientos)",
    perUserPerYear: "por usuario/año",
    totalOf: "Total de",
    perMonth: "/mes",
    perYear: "/año",
    months: "meses",
    billedAnnually: "Facturado anualmente",
    billedMonthly: "Facturado mensualmente",
    freePlanMaxSeats: "El plan gratuito permite un máximo de 5 miembros",
    reviewYourPlan: "Revisa tu plan",
    myTeamHas: "Mi equipo tiene",
    membersLabel: "miembros",
    choose: "Elegir",
    continueButton: "Continuar",
    goBack: "Volver",
    back: "Volver",
    whatsappLitePickMetaPixel: "Elige una integración de Meta Pixel",
    whatsappLiteSendToMetaPixel: "Enviar a Meta Pixel",
    whatsappLiteSendToMetaPixelHint:
      "Reporta los nuevos leads creados automáticamente como eventos de conversión a un Meta Pixel.",
    whatsappLiteNoMetaPixelIntegrations: "No se encontraron integraciones de Meta Pixel en este proyecto.",
    metaPixelIntegration: "Integración de Meta Pixel",
    metaPixelDefaultEventName: "Nombre del evento predeterminado",

    // Members
    invitations: "Invitaciones",
    failedInvitations: "Invitaciones fallidas",
    addMember: "Agregar Miembro",
    youCannotAddMoreMembers: "No puedes agregar más miembros",
    youCanOnlyAddUpTo: "Solo puedes agregar hasta {limit} miembros con el plan {plan}",
    membersWithThe: "miembros con el",
    plan: "plan",
    youDontHavePermissionToAddMembers: "No tienes permisos para agregar miembros",
    user: "Usuario",
    emailAddress: "Dirección de email",
    role: "Rol",
    status: "Estado",
    active: "Activo",
    inactive: "Inactivo",
    you: "(Tú)",
    removeUser: "Eliminar usuario",
    disable: "Deshabilitar",
    thisUserWillBeRemovedFromAllProjects: "este usuario será removido de todos los proyectos",

    // Invitations
    workspaceRole: "Rol del workspace",
    dateSent: "Fecha enviada",
    dateUpdated: "Fecha actualizada",
    noInvitationsFound: "No se encontraron invitaciones",
    noFailedInvitationsFound: "No se encontraron invitaciones fallidas",
    invitationSent: "Invitación enviada",
    pendingFor: "Pendiente por {days} días",
    acceptedInvitedAt: "Aceptado en {date}",
    removedInvitedAt: "Eliminado en {date}",
    rejectedInvitedAt: "Rechazado en {date}",
    expiredInvitedAt: "Expirado en {date}",
    canceledInvitedAt: "Cancelado en {date}",
    allStatuses: "Todos los estados",
    statusPending: "Pendiente",
    statusAccepted: "Aceptado",
    statusExpired: "Expirado",
    statusCanceled: "Cancelado",
    statusRejected: "Rechazado",
    statusRemoved: "Eliminado",
    cancelInvitation: "Cancelar invitación",
    invitationCanceled: "invitación cancelada",
    invitationExpired: "invitación expirada",
    invitationDeclined: "invitación rechazada",
    resendInvitation: "Reenviar invitación",
    removeFromList: "Eliminar de la lista",
    invitationSentSuccessfully: "invitación enviada exitosamente",

    // Roles and permissions
    rolesAndPermissions: "Roles y permisos",
    search: "Buscar...",
    createNewRole: "Crear nuevo rol",
    youCanOnlyCreateUpTo: "Solo puedes crear hasta {limit} roles personalizados en el plan {plan}",
    customRolesIn: "roles personalizados en el",
    noRolesFound: "No se encontraron roles",
    edit: "Editar",
    delete: "Eliminar",
    youCanOnlyDeleteCustomRoles: "Solo puedes eliminar roles personalizados",
    creatingNewRole: "Creando nuevo rol",
    saveChanges: "¿Guardar cambios?",
    youHaveUnsavedChanges: "Tienes cambios sin guardar.",
    discardChanges: "Descartar cambios",
    monthly: "Mensual",
    yearly: "Anual",
    quarterly: "Trimestral",
    semestral: "Semestral",
    billedQuarterly: "Facturado cada 3 meses",
    billedSemestrally: "Facturado cada 6 meses",
    saveUpToMessage: "Ahorra hasta {percentage}%{onYearlyPlan}",
    onYearlyPlan: " en el plan anual",
    saveUpTo: "AHORRA HASTA",
    noMembers: "No se encontraron miembros",
    noPlan: "Sin plan",
    upgradeNow: "Actualizar ahora",
    startedPlan: "Plan Iniciado",
    trial: "Trial",
    remaining: "restante",
    youreCurrentlyOnTheFreeForeverPlan: "Actualmente estás en el plan",
    foreverPlan: "para siempre.",
    free: "Gratis",
    upgradeForMore: "Actualiza para más",
    startYourFreeTrialNow: "Inicia tu prueba gratuita ahora",
    editingRole: "Editando rol",
    roleName: "Nombre del rol",
    roleNamePlaceholder: "Nombre del rol",
    workspace: "Workspace",
    projects: "Proyectos",
    timeTracker: "Rastreador de Tiempo",
    documents: "Biblioteca",
    create: "Crear",
    update: "Actualizar",
    fullPermission: "Permiso completo",
    checkAll: "Marcar todos",
    uncheckAll: "Desmarcar todos",
    rolesUiPeople: "Personas",
    rolesUiPeopleCount: "{count} personas",
    rolesUiOnePerson: "1 persona",
    rolesUiModulesWithAccess: "Módulos con acceso",
    rolesUiPermissions: "Permisos",
    rolesUiAllModules: "Todos los {count} módulos",
    rolesUiNoModules: "Ningún módulo",
    rolesUiCountOf: "{count} de {total}",
    rolesUiModuleOff: "Módulo deshabilitado",
    rolesUiFullArea: "Permiso completo en esta área",
    rolesUiMarkAll: "Marcar todos",
    rolesUiStandard: "Predeterminado",
    rolesUiCustom: "Personalizado",
    rolesUiLede:
      "Un cargo reúne lo que la persona puede hacer en cada módulo del workspace. Quién ve cada tablero se define en la configuración del proyecto.",
    rolesUiSearchPermissions: "Buscar en todas las áreas (ej.: lead, sprint, carpeta)",
    rolesUiOnlyActive: "Mostrar solo los activos",
    rolesUiResults: "{count} resultados",
    rolesUiApplyTemplate: "Aplicar plantilla",
    rolesUiTemplateApplied: "Plantilla {name} aplicada: {count} permisos. Revisa antes de guardar.",
    rolesUiTplViewer: "Solo ve proyectos, tarjetas, documentos y tiempo.",
    rolesUiTplCommenter: "Ve y comenta en tarjetas.",
    rolesUiTplCollaborator: "Trabaja en tarjetas, columnas, CRM, productos, documentos y tiempo.",
    rolesUiTplEditor: "Como Collaborator, además de crear proyectos y publicar documentos.",
    rolesUiTplAdmin: "Todos los permisos del workspace.",
    rolesUiNone: "Ninguno",
    rolesUiReadOnly: "Solo ver",
    rolesUiAll: "Todos",
    rolesUiActiveOfTotal: "{active} de {total} activos",
    rolesUiRequires: "Requiere “{label}”",
    rolesUiAlsoDisabled: "También apagué {count} permisos que dependen de “{label}”.",
    rolesUiAlsoEnabled: "También encendí “{label}”, necesario para esta acción.",
    rolesUiModuleGate:
      "Este cargo no tiene “{label}” (Workspace › Módulos). Los permisos de abajo solo valen cuando ese acceso esté encendido.",
    rolesUiTurnOnAccess: "Encender acceso",
    rolesUiUnsaved: "{count} cambios sin guardar",
    rolesUiAllSaved: "Todo guardado",
    rolesUiActiveCount: "{active} de {total} permisos activos",
    rolesUiNoMatch: "Ningún permiso coincide con “{query}”.",
    rolesUiNoActive: "Ningún permiso activo en esta área.",
    rolesUiVerbRead: "Ver",
    rolesUiVerbCreate: "Crear",
    rolesUiVerbUpdate: "Editar",
    rolesUiVerbDelete: "Eliminar",
    rolesUiVerbAction: "Acción",
    rolesUiAreas: "Áreas de permisos",
    roleUpdatedSuccessfully: "Rol actualizado exitosamente",
    loading: "Cargando...",
    deleteRoleDialogTitle: 'Eliminar rol "{roleName}"',
    deleteRoleDialogConfirmQuestion: '¿Eliminar el rol "{roleName}"?',
    deleteRoleDialogMustReassign: 'Todos los miembros deben reasignarse a un nuevo rol antes de eliminar "{roleName}".',
    deleteRoleDialogAssignedToMemberCount: "Este rol está asignado a {count} miembros.",
    deleteRoleDialogMembersHeading: "Miembros",
    deleteRoleDialogChangeAllToLabel: "Cambiar todos a:",
    deleteRoleDialogSelectNewRole: "Seleccionar nuevo rol",
    deleteRoleDialogDeleting: "Eliminando...",
    deleteRoleDialogDeleteRoleButton: "Eliminar rol",
    deleteRoleDialogReassignFailed: "No se pudo eliminar el rol. Inténtalo de nuevo.",
    deleteRoleDialogDeleteSuccessWithReassignment:
      'El rol "{roleName}" fue eliminado y los miembros fueron reasignados.',
    deleteRoleDialogDeleteSuccessNoMembers: 'El rol "{roleName}" fue eliminado.',
    createNewWorkspace: "Crear un nuevo workspace",
    noWorkspacesFound: "No se encontraron workspaces.",
    clientWorkspacesSectionTitle: "Espacios de trabajo de clientes",
    clientWorkspaceEnterError: "No se pudo abrir ese espacio de trabajo. Inténtalo de nuevo.",
    createWorkspaceDescription: "El espacio donde tu equipo colabora, comparte y realiza el trabajo.",
    addImage: "Agregar imagen",
    changeImage: "Cambiar imagen",
    language: "Idioma",
    selectLanguage: "Seleccionar idioma",
    createWorkspace: "Crear workspace",
    workspaceSettings: "Configuraciones del workspace",
    private: "Privado",
    cardExpiryExpired: "La fecha de vencimiento de la tarjeta ha expirado",
    cardExpiryInvalid: "Por favor, ingrese una fecha de vencimiento válida (MM/AA)",
    paymentDetails: "Detalles del pago",
    addNewCard: "Agregar una nueva tarjeta",
    cardInformation: "Información de la tarjeta",
    cardholderName: "Nombre del titular de la tarjeta",
    cardNumberPlaceholder: "1234 1234 1234 1234",
    cardExpiryPlaceholder: "MM/AA",
    cardCvcPlaceholder: "CVC",
    cardholderNamePlaceholder: "Nombre completo en la tarjeta",
    cardNumberInvalid: "Por favor, ingrese un número de tarjeta válido",
    cardCvcInvalid: "Por favor, ingrese un CVC válido",
    cardholderNameRequired: "Por favor, ingrese el nombre del titular de la tarjeta",
    failedToCreatePaymentMethod: "Error al crear método de pago",
    failedToCreateWorkspace: "Error al crear workspace",
    workspaceCreationSuccess: "¡Todo listo! Tu suscripción está activa",
    failedToCreatePaymentMethodOrWorkspace: "Error al crear método de pago o workspace. Por favor, intente nuevamente.",
    endedIn: "Termina en",
    expiration: "Vencimiento",
    noSavedPaymentMethods: "No hay métodos de pago guardados. Agregue una tarjeta para continuar.",
    deletePaymentMethod: "Eliminar método de pago",
    setDefaultPaymentMethod: "Establecer como predeterminado",
    defaultPaymentMethodBadge: "Predeterminado",
    saveCard: "Guardar tarjeta",
    billingPaymentMethods: "Métodos de pago",
    billingInvoices: "Facturas",
    billingCardsLoadError: "No se pudieron cargar los métodos de pago.",
    billingInvoicesLoadError: "No se pudieron cargar las facturas.",
    setDefaultPaymentMethodSuccess: "Método de pago predeterminado actualizado.",
    deletePaymentMethodSuccess: "Método de pago eliminado.",
    addPaymentMethodSuccess: "Tarjeta guardada.",
    cannotDeleteOnlyPaymentMethod: "Añade otra tarjeta antes de eliminar la última registrada.",
    noInvoices: "Todavía no hay facturas.",
    viewInvoice: "Ver",
    downloadInvoice: "PDF",
    billingInvoiceNumber: "Factura",
    billingInvoiceDate: "Fecha",
    billingInvoiceAmount: "Importe",
    billingInvoiceStatus: "Estado",
    billingInvoiceActions: "Acciones",
    billingViewMore: "Ver más",
    billingViewLess: "Ver menos",
    cardExpiresOn: "Caduca {month}/{year}",
    cardExpiredOn: "Caducada {month}/{year}",
    invoiceStatusPaid: "Pagada",
    invoiceStatusOpen: "Abierta",
    invoiceStatusDraft: "Borrador",
    invoiceStatusVoid: "Anulada",
    invoiceStatusUncollectible: "Incobrable",
    invoiceUntitled: "Factura",
    deletePaymentMethodConfirm: "¿Eliminar la tarjeta que termina en {last4}?",
    currentSubscription: "Suscripción actual",
    currentSubscriptionCustomHint: "Este precio ya no está en el catálogo público. Aún puedes gestionarlo aquí.",
    choosePaymentMethod: "Elija un método de pago para continuar.",
    cardDeclinedFraudulent:
      "Su tarjeta fue rechazada por razones de seguridad. Por favor, use un método de pago diferente.",
    cardDeclinedInsufficientFunds:
      "Su tarjeta no tiene fondos suficientes. Por favor, verifique el saldo de su cuenta o use un método de pago diferente.",
    cardDeclinedExpired:
      "Su tarjeta ha expirado. Por favor, verifique la fecha de vencimiento o use un método de pago diferente.",
    cardDeclinedLost: "Su tarjeta fue reportada como perdida. Por favor, use un método de pago diferente.",
    cardDeclinedStolen: "Su tarjeta fue reportada como robada. Por favor, use un método de pago diferente.",
    cardDeclinedGeneric:
      "Su tarjeta fue rechazada. Por favor, verifique los detalles de su tarjeta o use un método de pago diferente.",
    paymentFormNotReady: "El formulario de pago no está listo. Por favor, espere un momento.",
    checkPaymentDetails: "Por favor, verifique los detalles de pago",
    stripeKeyMissing: "Configuración de pago faltante. Por favor, contacte a soporte.",
    failedToCreateSetupIntent: "Error al inicializar el pago. Por favor, intente nuevamente.",
    failedToInitializePaymentForm: "Error al inicializar el formulario de pago. Por favor, intente nuevamente.",
    paymentSetupError: "Error en la Configuración del Pago",
    // Review bill / onboarding
    reviewYourBill: "Revisa tu factura",
    subtotal: "Subtotal",
    subtotalWithSeats: "Subtotal ({seats} asientos)",
    addPromotionCode: "Agregar código promocional",
    promotionCode: "Código promocional",
    promotionCodePlaceholder: "Ingresa tu código",
    apply: "Aplicar",
    discount: "Descuento",
    removePromotionCode: "Remover código promocional",
    total: "Total",
    // Promotion code validation
    promotionCodeRequired: "El código promocional es obligatorio",
    failedToValidatePromotionCode: "Error al validar el código promocional",
    promotionCodeNotFoundOrInactive: "Código promocional no encontrado o inactivo",
    promotionCodeNotValidForAccount: "Este código promocional no es válido para tu cuenta",
    promotionCodeSignInRequired:
      "Este código promocional está restringido a un cliente específico. Por favor, inicia sesión.",
    promotionCodeExpired: "El código promocional ya no es válido (expirado o límite de canjes alcanzado)",
    promotionCodeWrongPlan: "Este código promocional no aplica al plan seleccionado",
    promotionCodeWrongCurrency: "Este código promocional aplica solo a USD, no BRL",
    promotionCodeNoPricingForCurrency: "Este plan no tiene precios para esta moneda",
    promotionCodeFirstWorkspaceOnly: "Este código promocional solo es válido para tu primer workspace",
    promotionCodeFirstTimeSignInRequired:
      "Este código promocional es para creadores de workspace por primera vez. Por favor, inicia sesión.",
    // Promotion code success messages
    discountSuccessRepeatingPercent: "{percent}% de descuento aplicado a las próximas {months} factura(s).",
    discountSuccessRepeatingAmount: "{amount} de descuento aplicado a las próximas {months} factura(s).",
    discountSuccessOncePercent: "{percent}% de descuento aplicado a la primera factura.",
    discountSuccessOnceAmount: "{amount} de descuento aplicado a la primera factura.",
    discountSuccessForeverPercent: "{percent}% de descuento recurrente aplicado a todas las facturas.",
    discountSuccessForeverAmount: "{amount} de descuento recurrente aplicado a todas las facturas.",
    // Auth pages
    welcomeBack: "¡Bienvenido de vuelta!",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    passwordsDoNotMatch: "Las contraseñas no coinciden",
    forgotPassword: "¿Olvidaste tu contraseña?",
    signIn: "Iniciar sesión",
    or: "O",
    continueWithGoogle: "Continuar con Google",
    dontHaveAccount: "¿Aún no tienes una cuenta?",
    signUp: "Registrarse",
    emailOrPasswordInvalid: "Correo electrónico o contraseña inválidos.",
    somethingWentWrongTryAgain: "Algo salió mal, por favor intenta de nuevo.",
    // Sign up page
    createAccountInSeconds: "¡Crea una cuenta en segundos!",
    secureYourAccount: "Protege tu cuenta con una contraseña.",
    fullName: "Nombre completo",
    next: "Siguiente",
    alreadyHaveAccount: "¿Ya tienes una cuenta?",
    byClickingButton: "Al hacer clic en el botón de arriba, aceptas nuestros",
    iAgreeToThe: "Acepto los",
    termsOfService: "Términos de Servicio",
    and: "y",
    privacyPolicy: "Política de Privacidad.",
    enterValidEmail: "Por favor, ingresa un correo electrónico válido.",
    emailAlreadyRegistered: "Este correo ya está registrado. Intenta iniciar sesión o usa un correo diferente.",
    // Onboarding page metadata
    onboardingPageTitle: "JSYNQ - Onboarding",
    onboardingPageDescription: "Crea tu workspace seleccionando un plan y configurando tu equipo.",
    onboardingPlanPageTitle: "JSYNQ - Elige un plan",
    onboardingPlanPageDescription: "Selecciona un plan antes de crear tu workspace.",
    onboardingReviewPageTitle: "JSYNQ - Revisa tu factura",
    onboardingReviewPageDescription: "Revisa tu plan y aplica un código promocional antes del pago.",
    onboardingPaymentPageTitle: "JSYNQ - Detalles del pago",
    onboardingPaymentPageDescription: "Selecciona un método de pago para completar la configuración de tu workspace.",
    onboardingPaymentDetailsPageTitle: "JSYNQ - Detalles del pago",
    onboardingPaymentDetailsPageDescription:
      "Ingresa tus datos de pago para completar la configuración de tu workspace.",
    onboardingInviteMembersPageTitle: "JSYNQ - Invitar miembros",
    onboardingInviteMembersPageDescription: "Invita a miembros del equipo a colaborar en tu workspace.",

    integrationPageSubtitle:
      "Conecta y gestiona integraciones del workspace para extender funcionalidades y automatizar flujos de trabajo.",
    integrationAddTelegram: "Añadir integración de Telegram",
    integrationLoading: "Cargando integraciones...",
    integrationConnectedTitle: "Integraciones conectadas",
    integrationActive: "Activo",
    integrationInactive: "Inactivo",
    integrationUpdated: "Actualizado",
    integrationOpen: "Abrir",
    integrationConfigure: "Configurar",
    integrationGenerateLinkCode: "Generar código de enlace",
    integrationEmptyTitle: "Aún no hay integraciones",
    integrationEmptyBody: "Añade tu primera integración para comenzar.",
    integrationDiscoverTitle: "Descubrir integraciones",
    integrationTelegramCardTitle: "Telegram",
    integrationTelegramCardDescription:
      "Conecta Telegram a nivel workspace para consultas seguras del asistente de solo lectura.",
    clickupWsCardTitle: "ClickUp",
    clickupWsCardDescription:
      "Importa varias listas de ClickUp a la vez. Cada lista se convierte en un proyecto nuevo en JSYNQ con estados, tareas, comentarios, adjuntos y Docs en la Library.",
    clickupWsBtnManage: "Administrar importación",
    clickupWsConnectedStatus: "Estado de importación: {status}",
    clickupWsConnectedSubtitle: "Importación masiva de listas",
    clickupWsImportStartedToast:
      "Importación iniciada para {count} lista(s). Puedes cerrar la página — sigue en segundo plano.",
    clickupWsStatus_processing: "Importación en progreso",
    clickupWsStatus_queued: "Importación en cola",
    clickupWsStatus_completed: "Importación completada",
    clickupWsStatus_failed: "Importación fallida",
    clickupWsStatus_idle: "Listo para importar",
    clickupWsModalTitle: "Importación ClickUp del workspace",
    clickupWsModalIntro:
      "Conecta ClickUp, elige el team y el space, y selecciona listas o carpetas. Cada lista seleccionada se crea como proyecto en este workspace.",
    clickupWsAuthentication: "Autenticación",
    clickupWsAuthenticate: "Autenticar con ClickUp",
    clickupWsReauth: "Reautenticar con ClickUp",
    clickupWsReauthHint: "Vuelve a autenticarte para explorar ClickUp e importar más listas.",
    clickupWsReauthOptional: "Vuelve a autenticarte solo si la conexión expiró o quieres otra cuenta de ClickUp.",
    clickupWsAuthenticating: "Autenticando...",
    clickupWsAuthenticated: "ClickUp autenticado",
    clickupWsSelectTeam: "Team ClickUp (Workspace)",
    clickupWsChooseTeam: "Elige un team",
    clickupWsLoadingTeams: "Cargando teams...",
    clickupWsSelectSpace: "Space",
    clickupWsChooseSpace: "Elige un space",
    clickupWsLoadingSpaces: "Cargando spaces...",
    clickupWsSelectLists: "Listas y carpetas",
    clickupWsSelectAll: "Seleccionar todo en el space",
    clickupWsLoadingLists: "Cargando listas...",
    clickupWsNoLists: "No hay listas en este space.",
    clickupWsSelectedCount: "{count} lista(s) seleccionada(s)",
    clickupWsImportButton: "Importar {count} lista(s) como proyectos",
    clickupWsImporting: "Importando...",
    clickupWsResults: "Resultados de la importación",
    clickupWsDisconnect: "Desconectar ClickUp",
    clickupWsAuthFailed: "Falló la autenticación de ClickUp",
    clickupWsConnectFailed: "No se pudo guardar la conexión de ClickUp",
    clickupWsConnectedToast: "ClickUp conectado al workspace",
    clickupWsImportFailed: "Falló la importación de ClickUp",
    clickupWsImportSuccess: "Se importaron {count} lista(s) de ClickUp como proyectos",
    clickupWsImportPartial: "Importadas {ok} lista(s); {failed} fallaron",
    clickupWsDisconnectFailed: "No se pudo desconectar ClickUp",
    clickupWsDisconnectedToast: "ClickUp desconectado",
    clickupWsFailedTeams: "No se pudieron cargar los teams de ClickUp",
    clickupWsFailedSpaces: "No se pudieron cargar los spaces de ClickUp",
    clickupWsFailedFolders: "No se pudieron cargar las carpetas de ClickUp",
    clickupWsFailedLists: "No se pudieron cargar las listas de ClickUp",
    rdStationWsCardTitle: "RD Station CRM",
    rdStationWsCardDescription:
      "Conecta RD Station CRM para mantener los negocios sincronizados en ambos sentidos: se crea un proyecto dedicado con una columna por etapa del pipeline, y los cambios en cualquiera de los sistemas actualizan el otro automáticamente.",
    rdStationWsConnectButton: "Conectar RD Station",
    rdStationWsConnecting: "Conectando",
    rdStationWsConnected: "Conectado",
    rdStationWsAttention: "Atención",
    rdStationWsAuthenticating: "Autenticando...",
    rdStationWsAuthFailed: "Falló la autenticación de RD Station",
    rdStationWsConnectFailed: "No se pudo conectar RD Station",
    rdStationWsSettingUp: "Configurando tu proyecto de CRM y las columnas del pipeline...",
    rdStationWsConnectedToast: "RD Station conectado — tu proyecto de CRM está listo",
    rdStationWsViewProject: "Ver proyecto de CRM",
    rdStationWsReconnect: "Reconectar",
    rdStationWsReconcile: "Actualizar leads de RD Station",
    rdStationWsReconciling: "Encolando…",
    rdStationWsReconcileQueued: "Actualización en cola. Las tarjetas que ya existen se actualizan, sin duplicar.",
    rdStationWsReconcileFailed: "No se pudo encolar la actualización de los leads",
    rdStationWsDisconnect: "Desconectar RD Station",
    rdStationWsDisconnecting: "Desconectando…",
    rdStationWsDisconnectFailed: "No se pudo desconectar RD Station",
    rdStationWsDisconnectedToast: "RD Station desconectado",
    rdStationWsDisconnectTitle: "Desconectar RD Station",
    rdStationWsDisconnectDescription:
      "Esto detiene la sincronización entre JSYNQ y RD Station CRM. El proyecto de CRM y sus tarjetas permanecen en JSYNQ, pero dejarán de actualizar RD Station o de recibir actualizaciones de él.",
    rdStationWsAlreadyConnectedError: "Este workspace ya tiene una conexión RD Station activa. Desconéctala primero.",
    rdStationWsSelectPipelinesTitle: "Selecciona los embudos para importar",
    rdStationWsSelectPipelinesDescription:
      "Elige qué embudos (funis) de RD Station traer a JSYNQ. Cada uno se convierte en su propio proyecto dedicado.",
    rdStationWsNoPipelinesFound: "No se encontraron embudos en tu cuenta de RD Station.",
    rdStationWsPipelineStages: "{count} etapas",
    rdStationWsImportButton: "Importar seleccionados",
    rdStationWsImporting: "Configurando tus proyectos de CRM...",
    rdStationWsImportFailed: "No se pudieron importar los embudos seleccionados",
    rdStationWsSelectAtLeastOne: "Selecciona al menos un embudo",
    rdStationWsCancelSelectionConfirmTitle: "¿Cancelar la conexión con RD Station?",
    rdStationWsCancelSelectionConfirmDescription:
      "Te autenticaste con RD Station pero aún no elegiste ningún embudo. Cerrar ahora cancela la conexión — tendrás que autenticarte de nuevo para reintentar.",
    kommoWsCardTitle: "Kommo CRM",
    kommoWsCardDescription:
      "Importa los embudos de Kommo a un solo proyecto de CRM. Cada pipeline se convierte en una pestaña, y las empresas, contactos y leads llegan desde Kommo.",
    kommoWsConnectButton: "Conectar Kommo",
    kommoWsConnecting: "Conectando…",
    kommoWsConnected: "Conectado",
    kommoWsAttention: "Atención",
    kommoWsConnectFailed: "No se pudo conectar Kommo",
    kommoWsConnectedToast: "Kommo conectado — tu proyecto de CRM está listo",
    kommoWsImportingToast: "Kommo conectado — importando embudos y leads…",
    kommoWsReimportedToast: "Los datos de Kommo se reimportaron",
    kommoWsViewProject: "Ver proyecto de CRM",
    kommoWsReconnect: "Reconectar",
    kommoWsRetryImport: "Reintentar importación",
    kommoWsReimport: "Reimportar",
    kommoWsImporting: "Importando desde Kommo…",
    kommoWsImportFailed: "No se pudo importar la cuenta de Kommo",
    kommoWsDisconnect: "Desconectar Kommo",
    kommoWsDisconnecting: "Desconectando…",
    kommoWsDisconnectFailed: "No se pudo desconectar Kommo",
    kommoWsDisconnectedToast: "Kommo desconectado",
    kommoWsDisconnectTitle: "Desconectar Kommo",
    kommoWsDisconnectDescription:
      "Esto detiene las actualizaciones entrantes de Kommo. El proyecto de CRM, las empresas, los contactos y las tarjetas permanecen en JSYNQ.",
    kommoWsSubdomainLabel: "Subdominio",
    kommoWsSubdomainPlaceholder: "acme",
    kommoWsSubdomainHint: "El “conta” de conta.kommo.com — puedes pegar la URL completa.",
    kommoWsTokenLabel: "Token de acceso de larga duración",
    kommoWsTokenPlaceholder: "Pega el token de tu integración privada en Kommo",
    kommoWsFieldsRequired: "Introduce el subdominio y el token de acceso.",
    kommoWsPipelineCount: "{count} embudos",
    kommoWsModalTitle: "Kommo CRM",
    kommoWsModalIntro:
      "Conecta tu cuenta de Kommo con el subdominio y un token de larga duración de la integración privada.",
    googleWsCardDescription:
      "Conecta Gmail y Google Calendar para que tu agente pueda leer correos, crear borradores y gestionar eventos del calendario.",
    googleWsConnectButton: "Conectar Google",
    googleWsRedirecting: "Redirigiendo…",
    googleWsConnected: "Conectado",
    googleWsAttention: "Atención",
    googleWsToolsCount: "{count} herramientas",
    googleWsTestConnection: "Probar conexión",
    googleWsReconnect: "Reconectar",
    googleWsDisconnect: "Desconectar",
    googleWsDisconnectTitle: "Desconectar Google",
    googleWsDisconnectDescription:
      "Esto eliminará el acceso del agente a Gmail y Google Calendar. Podrás reconectar en cualquier momento.",
    googleWsDisconnecting: "Desconectando…",
    googleWsSessionExpired: "Sesión expirada. Inicia sesión de nuevo.",
    googleWsDisconnectFailed: "Error al desconectar una o más conexiones de Google.",
    googleWsDisconnectedToast: "Google desconectado correctamente.",
    googleWsDisconnectUnexpectedError: "Error inesperado al desconectar Google.",
    googleWsTestHealthy: "¡Conexión saludable!",
    googleWsTestFailed: "La prueba de conexión falló.",
    googleWsTestUnexpectedError: "Error inesperado al probar la conexión.",
    googleWsStatusHealthy: "Conectado",
    googleWsStatusDegraded: "Degradado",
    googleWsStatusUnhealthy: "Error",
    googleWsStatusUnknown: "Desconocido",
    googleWsOAuthSuccessToast: "¡Google conectado! Gmail y Calendar disponibles.",
    googleWsOAuthUnknownError: "Error desconocido",
    googleWsOAuthAccessDenied: "Cancelaste la autorización. Haz clic de nuevo para conectar.",
    googleWsOAuthNotConfigured: "La integración de Google no está configurada. Contacta al administrador.",
    googleWsOAuthFailed: "Error al conectar Google: {error}",
    integrationBtnConnect: "Conectar",
    integrationBtnConnected: "Conectado",
    integrationModalPickFirst: "Selecciona una integración para configurar.",
    integrationModalHint:
      "Asistente de Telegram de este workspace · Cada persona vincula su cuenta con un código de un solo uso.",
    integrationTabOverview: "Resumen",
    integrationTabSetup: "Conexión",
    integrationTabLinkUsers: "Vincular cuentas",
    integrationTabHelp: "Ayuda",
    integrationOverviewIntro:
      "Usa Conexión para añadir o cambiar el bot. Usa Vincular cuentas para que las personas conecten Telegram al workspace.",
    integrationOverviewBotLanguage: "Idioma del bot",
    integrationOverviewNotSet: "Aún no definido",
    integrationOverviewLastUpdated: "Última actualización",
    integrationOverviewCreated: "Creado",
    integrationOverviewWebhookTitle: "Dirección del webhook",
    integrationOverviewCopyWebhook: "Copiar URL del webhook",
    integrationOverviewWebhookHelp:
      "Útil si tu equipo de TI verifica la integración. El día a día está en la pestaña Conexión.",
    integrationOverviewSecretsNote:
      "Los tokens guardados no se muestran en la app: usa Conexión e introdúcelos de nuevo al cambiar la integración.",
    integrationSetupIntro:
      "Conecta tu bot de Telegram y elige cómo el asistente accede a los datos del workspace. Los secretos guardados no se vuelven a mostrar: pega valores nuevos al actualizar.",
    integrationSetupBotFatherTitle: "¿Dónde obtengo el token del bot?",
    integrationSetupBotFatherStep1: "Abre Telegram y habla con @BotFather.",
    integrationSetupBotFatherStep2: "Envía /newbot y sigue los pasos.",
    integrationSetupBotFatherStep3: "Copia el token (formato 123456:AA…) en el campo de abajo.",
    integrationSetupBotTokenLabel: "Token de BotFather",
    integrationSetupBotTokenPlaceholder: "Pega el token aquí",
    integrationSetupLanguageLabel: "Idioma del asistente (opcional)",
    integrationSetupLanguagePlaceholder: "p. ej. en, es",
    integrationSetupAutoTokenTitle: "Crear un token de API para este bot automáticamente",
    integrationSetupAutoTokenDesc:
      "Elige permisos abajo y confirma. Creamos el token en segundo plano y lo enviamos al guardar. Desactiva para pegar un token existente.",
    integrationSetupScopesAccordion: "A qué puede acceder el asistente",
    integrationSetupConfirmToken: "Confirmar permisos y crear acceso",
    integrationSetupConfirmTokenWorking: "Creando acceso…",
    integrationSetupManualTokenLabel: "Tu token de API",
    integrationSetupManualHelp: "Créalo en Configuración → Miembros en tu perfil y pégalo aquí.",
    integrationSetupWebhookAdvanced: "URL del webhook (avanzado)",
    integrationSetupCopy: "Copiar",
    integrationSetupSaving: "Guardando…",
    integrationSetupSave: "Guardar conexión",
    integrationSetupNoPermission: "Necesitas permiso para gestionar integraciones del workspace.",
    integrationLinkSavedTitle: "Conexión guardada",
    integrationLinkSavedBody: "Genera un código abajo y envíalo al bot para que las personas vinculen Telegram.",
    integrationLinkTitle: "Vincular una cuenta de Telegram",
    integrationLinkBody: "Te daremos un código corto. En Telegram, abre el bot del workspace y envía:",
    integrationLinkGetCode: "Obtener nuevo código",
    integrationLinkCreatingCode: "Creando código…",
    integrationLinkYourCode: "Tu código",
    integrationLinkCopy: "Copiar",
    integrationLinkExpired: "Caducado — genera otro",
    integrationLinkValidFor: "Válido durante",
    integrationTroubleshootIntro: "Si algo no funciona, revisa primero:",
    integrationTroubleshoot1Title: "Telegram no llega a tu servidor",
    integrationTroubleshoot1Body:
      "La app debe estar en HTTPS público. Comprueba en Resumen que la URL del webhook coincida con tu backend.",
    integrationTroubleshoot2Title: "El bot dice que no estás vinculado",
    integrationTroubleshoot2Body:
      "Genera un código nuevo en Vincular cuentas, envíalo desde la misma cuenta de Telegram y úsalo antes de que caduque.",
    integrationTroubleshoot3Title: "Las respuestas están vacías o muy limitadas",
    integrationTroubleshoot3Body:
      "En Conexión, asegúrate de tener permisos suficientes (o un token que lea proyectos y tareas). El usuario debe tener acceso en el workspace.",
    integrationCreateModalTitle: "Añadir integración de Telegram",
    integrationCreateNameLabel: "Nombre",
    integrationCreateNamePlaceholder: "Asistente de Telegram del workspace",
    integrationCreateDescLabel: "Descripción (opcional)",
    integrationCreateDescPlaceholder: "Asistente de solo lectura para usuarios del workspace",
    integrationCreateButton: "Crear integración",
    integrationCreateCreating: "Creando...",
    integrationCountdownExpired: "Caducado",
    integrationToastNameRequired: "El nombre es obligatorio",
    integrationToastCreated: "Integración de Telegram creada",
    integrationToastContinueSetup: "Integración creada. Continúa con la configuración de Telegram.",
    integrationToastBotTokenRequired: "El token del bot es obligatorio",
    integrationToastNeedGeneratedToken:
      "Confirma los permisos primero para crear el token de API (o pega uno si desactivaste la creación automática).",
    integrationToastPasteToken: "Pega tu token de API antes de guardar.",
    integrationToastScopesAndToken: "Elige al menos un permiso y confirma para crear el token de API.",
    integrationToastSetupSaved: "Configuración de Telegram guardada",
    integrationToastLinkCodeOk: "Código de enlace generado",
    integrationToastCodeCopied: "Código copiado",
    integrationToastWebhookCopied: "URL del webhook copiada",
    integrationToastPermissionsChanged: "Permisos cambiados — confirma de nuevo para crear un nuevo token de API.",
    integrationToastSignInForToken: "Inicia sesión para crear el token de API.",
    integrationToastPickScopes: "Elige al menos un permiso primero.",
    integrationToastTokenFail: "No se pudo crear el token de API",
    integrationToastTokenCreatedAgain:
      "Acceso creado — haz clic en Guardar conexión cuando esté listo. Tus otros tokens siguen activos.",
    integrationToastTokenCreated:
      "Acceso creado — haz clic en Guardar conexión cuando el resto del formulario esté listo.",
    integrationDefaultName: "Asistente de Telegram del workspace",
    integrationDefaultDescription: "Asistente de solo lectura para usuarios del workspace",
    errorUserNotAuthenticated: "Usuario no autenticado",
    errorLabelLength: "La etiqueta debe tener 80 caracteres o menos",
    errorCouldNotLoadTokens: "No se pudieron cargar los tokens de API",
    errorCouldNotRevokeToken: "No se pudo revocar el token",
    errorFailedToCreateToken: "Error al crear el token",
    errorTokenNotAvailable: "La copia solo está disponible justo después de crear un token",
    errorFailedToCopy: "Error al copiar el token",
    integrationDelete: "Eliminar",
    integrationDeleting: "Eliminando...",
    integrationDeleteConfirm:
      "¿Estás seguro de que deseas eliminar esta integración? Esta acción no se puede deshacer.",
    integrationDeleteSuccess: "Integración eliminada correctamente",
    integrationDeleteError: "Error al eliminar la integración",
    integrationEnable: "Activar",
    integrationDisable: "Desactivar",
    integrationEnabling: "Activando...",
    integrationDisabling: "Desactivando...",
    integrationStatusUpdated: "Estado de la integración actualizado",
    integrationStatusUpdateError: "Error al actualizar el estado de la integración",
    integrationDisconnect: "Desconectar",
    integrationWebhookUrl: "URL del Webhook",
    // API Token Scopes
    apiTokenScopesTitle: "Permisos del token",
    apiTokenPermissionsSelected: (count: number) =>
      `${count} permiso${count === 1 ? "" : "s"} seleccionado${count === 1 ? "" : "s"} · expande cada área debajo`,
    apiTokenScopesSelected: (count: number) =>
      `${count} seleccionado${count === 1 ? "" : "s"} · expande cada categoría`,
    apiTokenPresetAssistant: "Mínimo del asistente",
    apiTokenPresetReadAll: "Todos los permisos de lectura",
    apiTokenPresetClear: "Limpiar",
    apiTokenPresetSelectAll: "Seleccionar todos los permisos (acceso total en esta lista)",
    apiTokenScopesHelperEmbedded:
      "Solo los elementos marcados están permitidos para este bot. Ajusta según cuánto quieres que vea el asistente.",
    apiTokenScopesHelperDefault:
      "Solo los permisos marcados están incluidos. Los IDs de permiso desconocidos son rechazados por el servidor.",
    // Scope group categories
    scopeCategoryWorkspaces: "Workspaces",
    scopeCategoryProjects: "Proyectos",
    scopeCategoryCards: "Cards",
    scopeCategoryDocuments: "Documentos",
    scopeCategoryMeetings: "Reuniones y transcripciones",
    scopeCategoryDashboard: "Dashboard y tiempo",
    // Scope labels
    scopeWorkspacesRead: "Workspaces (lectura)",
    scopeWorkspacesWrite: "Workspaces (escritura)",
    scopeProjectsRead: "Proyectos (lectura)",
    scopeProjectsWrite: "Proyectos (escritura)",
    scopeCardsRead: "Cards (lectura)",
    scopeCardsWrite: "Cards (escritura)",
    scopeDocumentsRead: "Documentos (lectura)",
    scopeDocumentsWrite: "Documentos (escritura)",
    scopeMeetingsRead: "Reuniones (lectura)",
    scopeTranscriptsRead: "Transcripciones (lectura)",
    scopeDashboardRead: "Dashboard (lectura)",
    scopeTimeTrackerRead: "Registro de tiempo (lectura)",
    scopeTimeTrackerWrite: "Registro de tiempo (escritura)",
    // Scope descriptions
    scopeDescWorkspacesRead: "Leer datos del workspace",
    scopeDescWorkspacesWrite: "Crear o actualizar recursos del workspace",
    scopeDescProjectsRead: "Listar proyectos y leer metadatos",
    scopeDescProjectsWrite: "Crear o actualizar proyectos",
    scopeDescCardsRead: "Leer cards y datos de tareas",
    scopeDescCardsWrite: "Crear o actualizar cards",
    scopeDescDocumentsRead: "Leer documentos",
    scopeDescDocumentsWrite: "Crear o actualizar documentos",
    scopeDescMeetingsRead: "Leer datos de reuniones",
    scopeDescTranscriptsRead: "Leer transcripciones",
    scopeDescDashboardRead: "Leer datos del dashboard",
    scopeDescTimeTrackerRead: "Leer registros de tiempo",
    scopeDescTimeTrackerWrite: "Crear o actualizar registros de tiempo",
    integrationSetupPostSaveMessage: "Listo — tu bot quedó vinculado con el token de API que guardaste.",
    integrationLinkInstructionsFallback: "Envía el código a tu bot en Telegram con /link.",
    integrationLinkKbdExample: "/link TU_CÓDIGO",
    integrationApiTokenLabel: "Asistente de Telegram",
    // Wizard steps
    integrationWizardStep1Label: "Configuración del Bot",
    integrationWizardStep2Label: "Token de API",
    integrationWizardStep3Label: "Revisar y Conectar",
    integrationWizardContinue: "Continuar",
    integrationWizardBack: "Atrás",
    integrationWizardReviewTitle: "Revisa tu configuración antes de conectar:",
    integrationWizardBotConfigLabel: "Token del Bot",
    integrationWizardLanguageConfigLabel: "Idioma",
    integrationWizardTokenMethodLabel: "Método del Token",
    integrationWizardTokenMethodAuto: "Generado automáticamente",
    integrationWizardTokenMethodManual: "Entrada manual",
    integrationWizardScopesLabel: "Permisos",
    integrationWizardScopesCount: "{count} permisos seleccionados",
    integrationWizardTokenConfigured: "El token del bot ya está configurado",
    integrationWizardTokenReplace: "Reemplazar token",
    integrationWizardScopeRequired: "Por favor selecciona al menos un permiso",
    integrationWizardApiTokenRequired: "El token de API es obligatorio",
    integrationWizardBotTokenRequired: "El token del bot es obligatorio",

    // MCP Connections
    addConnection: "Agregar Conexión",
    testConnection: "Probar Conexión",
    connectionHealthy: "Saludable",
    connectionDegraded: "Degradada",
    connectionUnhealthy: "No Saludable",
    connectionUnknown: "Desconocido",

    // Agents
    agents: "Agentes",
    createAgent: "Crear Agente",
    agentTypeSpecialized: "Especializado",
    agentTypeOrchestrator: "Orquestador",
    systemPrompt: "Prompt del Sistema",
    availableTools: "Herramientas Disponibles",
    modelConfig: "Configuración del Modelo",
    temperature: "Temperatura",
    maxSteps: "Pasos Máximos",

    // Workflows
    workflows: "Flujos de Trabajo",
    createWorkflow: "Crear Flujo de Trabajo",
    stepName: "Nombre del Paso",
    variableMapping: "Mapeo de Variables",

    // Chat
    selectAgent: "Seleccionar Agente",
    sendMessage: "Enviar Mensaje",
    confirmationRequired: "Confirmación Requerida",
    approve: "Aprobar",
    reject: "Rechazar",
    automationsHubNav: "Automatizaciones",
  },
} as const

export type Language = keyof typeof workspaceSettingsTranslations
