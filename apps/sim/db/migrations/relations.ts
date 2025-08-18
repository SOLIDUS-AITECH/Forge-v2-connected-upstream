import { relations } from "drizzle-orm/relations";
import { user, customTools, knowledgeBase, knowledgeBaseTagDefinitions, account, environment, apiKey, marketplace, workflow, organization, session, invitation, member, chat, workspace, memory, workflowFolder, workflowBlocks, workflowEdges, workflowSubflows, workspaceInvitation, permissions, userStats, workflowExecutionSnapshots, workflowExecutionLogs, copilotChats, document, embedding, templates, templateStars, settings, userRateLimits, webhook, workflowSchedule, copilotCheckpoints } from "./schema";

export const customToolsRelations = relations(customTools, ({one}) => ({
	user: one(user, {
		fields: [customTools.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	customTools: many(customTools),
	accounts: many(account),
	environments: many(environment),
	apiKeys: many(apiKey),
	marketplaces: many(marketplace),
	sessions: many(session),
	invitations: many(invitation),
	members: many(member),
	chats: many(chat),
	workspaces: many(workspace),
	knowledgeBases: many(knowledgeBase),
	workflows: many(workflow),
	workflowFolders: many(workflowFolder),
	workspaceInvitations: many(workspaceInvitation),
	permissions: many(permissions),
	userStats: many(userStats),
	copilotChats: many(copilotChats),
	templateStars: many(templateStars),
	templates: many(templates),
	settings: many(settings),
	userRateLimits: many(userRateLimits),
	copilotCheckpoints: many(copilotCheckpoints),
}));

export const knowledgeBaseTagDefinitionsRelations = relations(knowledgeBaseTagDefinitions, ({one}) => ({
	knowledgeBase: one(knowledgeBase, {
		fields: [knowledgeBaseTagDefinitions.knowledgeBaseId],
		references: [knowledgeBase.id]
	}),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({one, many}) => ({
	knowledgeBaseTagDefinitions: many(knowledgeBaseTagDefinitions),
	user: one(user, {
		fields: [knowledgeBase.userId],
		references: [user.id]
	}),
	workspace: one(workspace, {
		fields: [knowledgeBase.workspaceId],
		references: [workspace.id]
	}),
	documents: many(document),
	embeddings: many(embedding),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const environmentRelations = relations(environment, ({one}) => ({
	user: one(user, {
		fields: [environment.userId],
		references: [user.id]
	}),
}));

export const apiKeyRelations = relations(apiKey, ({one}) => ({
	user: one(user, {
		fields: [apiKey.userId],
		references: [user.id]
	}),
}));

export const marketplaceRelations = relations(marketplace, ({one}) => ({
	user: one(user, {
		fields: [marketplace.authorId],
		references: [user.id]
	}),
	workflow: one(workflow, {
		fields: [marketplace.workflowId],
		references: [workflow.id]
	}),
}));

export const workflowRelations = relations(workflow, ({one, many}) => ({
	marketplaces: many(marketplace),
	chats: many(chat),
	memories: many(memory),
	workflowFolder: one(workflowFolder, {
		fields: [workflow.folderId],
		references: [workflowFolder.id]
	}),
	user: one(user, {
		fields: [workflow.userId],
		references: [user.id]
	}),
	workspace: one(workspace, {
		fields: [workflow.workspaceId],
		references: [workspace.id]
	}),
	workflowEdges: many(workflowEdges),
	workflowSubflows: many(workflowSubflows),
	workflowBlocks: many(workflowBlocks),
	workflowExecutionLogs: many(workflowExecutionLogs),
	workflowExecutionSnapshots: many(workflowExecutionSnapshots),
	copilotChats: many(copilotChats),
	templates: many(templates),
	webhooks: many(webhook),
	workflowSchedules: many(workflowSchedule),
	copilotCheckpoints: many(copilotCheckpoints),
}));

export const sessionRelations = relations(session, ({one}) => ({
	organization: one(organization, {
		fields: [session.activeOrganizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const organizationRelations = relations(organization, ({many}) => ({
	sessions: many(session),
	invitations: many(invitation),
	members: many(member),
}));

export const invitationRelations = relations(invitation, ({one}) => ({
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id]
	}),
}));

export const memberRelations = relations(member, ({one}) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id]
	}),
}));

export const chatRelations = relations(chat, ({one}) => ({
	user: one(user, {
		fields: [chat.userId],
		references: [user.id]
	}),
	workflow: one(workflow, {
		fields: [chat.workflowId],
		references: [workflow.id]
	}),
}));

export const workspaceRelations = relations(workspace, ({one, many}) => ({
	user: one(user, {
		fields: [workspace.ownerId],
		references: [user.id]
	}),
	knowledgeBases: many(knowledgeBase),
	workflows: many(workflow),
	workflowFolders: many(workflowFolder),
	workspaceInvitations: many(workspaceInvitation),
}));

export const memoryRelations = relations(memory, ({one}) => ({
	workflow: one(workflow, {
		fields: [memory.workflowId],
		references: [workflow.id]
	}),
}));

export const workflowFolderRelations = relations(workflowFolder, ({one, many}) => ({
	workflows: many(workflow),
	workflowFolder: one(workflowFolder, {
		fields: [workflowFolder.parentId],
		references: [workflowFolder.id],
		relationName: "workflowFolder_parentId_workflowFolder_id"
	}),
	workflowFolders: many(workflowFolder, {
		relationName: "workflowFolder_parentId_workflowFolder_id"
	}),
	user: one(user, {
		fields: [workflowFolder.userId],
		references: [user.id]
	}),
	workspace: one(workspace, {
		fields: [workflowFolder.workspaceId],
		references: [workspace.id]
	}),
}));

export const workflowEdgesRelations = relations(workflowEdges, ({one}) => ({
	workflowBlock_sourceBlockId: one(workflowBlocks, {
		fields: [workflowEdges.sourceBlockId],
		references: [workflowBlocks.id],
		relationName: "workflowEdges_sourceBlockId_workflowBlocks_id"
	}),
	workflowBlock_targetBlockId: one(workflowBlocks, {
		fields: [workflowEdges.targetBlockId],
		references: [workflowBlocks.id],
		relationName: "workflowEdges_targetBlockId_workflowBlocks_id"
	}),
	workflow: one(workflow, {
		fields: [workflowEdges.workflowId],
		references: [workflow.id]
	}),
}));

export const workflowBlocksRelations = relations(workflowBlocks, ({one, many}) => ({
	workflowEdges_sourceBlockId: many(workflowEdges, {
		relationName: "workflowEdges_sourceBlockId_workflowBlocks_id"
	}),
	workflowEdges_targetBlockId: many(workflowEdges, {
		relationName: "workflowEdges_targetBlockId_workflowBlocks_id"
	}),
	workflowBlock: one(workflowBlocks, {
		fields: [workflowBlocks.parentId],
		references: [workflowBlocks.id],
		relationName: "workflowBlocks_parentId_workflowBlocks_id"
	}),
	workflowBlocks: many(workflowBlocks, {
		relationName: "workflowBlocks_parentId_workflowBlocks_id"
	}),
	workflow: one(workflow, {
		fields: [workflowBlocks.workflowId],
		references: [workflow.id]
	}),
	webhooks: many(webhook),
	workflowSchedules: many(workflowSchedule),
}));

export const workflowSubflowsRelations = relations(workflowSubflows, ({one}) => ({
	workflow: one(workflow, {
		fields: [workflowSubflows.workflowId],
		references: [workflow.id]
	}),
}));

export const workspaceInvitationRelations = relations(workspaceInvitation, ({one}) => ({
	user: one(user, {
		fields: [workspaceInvitation.inviterId],
		references: [user.id]
	}),
	workspace: one(workspace, {
		fields: [workspaceInvitation.workspaceId],
		references: [workspace.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({one}) => ({
	user: one(user, {
		fields: [permissions.userId],
		references: [user.id]
	}),
}));

export const userStatsRelations = relations(userStats, ({one}) => ({
	user: one(user, {
		fields: [userStats.userId],
		references: [user.id]
	}),
}));

export const workflowExecutionLogsRelations = relations(workflowExecutionLogs, ({one}) => ({
	workflowExecutionSnapshot: one(workflowExecutionSnapshots, {
		fields: [workflowExecutionLogs.stateSnapshotId],
		references: [workflowExecutionSnapshots.id]
	}),
	workflow: one(workflow, {
		fields: [workflowExecutionLogs.workflowId],
		references: [workflow.id]
	}),
}));

export const workflowExecutionSnapshotsRelations = relations(workflowExecutionSnapshots, ({one, many}) => ({
	workflowExecutionLogs: many(workflowExecutionLogs),
	workflow: one(workflow, {
		fields: [workflowExecutionSnapshots.workflowId],
		references: [workflow.id]
	}),
}));

export const copilotChatsRelations = relations(copilotChats, ({one, many}) => ({
	user: one(user, {
		fields: [copilotChats.userId],
		references: [user.id]
	}),
	workflow: one(workflow, {
		fields: [copilotChats.workflowId],
		references: [workflow.id]
	}),
	copilotCheckpoints: many(copilotCheckpoints),
}));

export const documentRelations = relations(document, ({one, many}) => ({
	knowledgeBase: one(knowledgeBase, {
		fields: [document.knowledgeBaseId],
		references: [knowledgeBase.id]
	}),
	embeddings: many(embedding),
}));

export const embeddingRelations = relations(embedding, ({one}) => ({
	document: one(document, {
		fields: [embedding.documentId],
		references: [document.id]
	}),
	knowledgeBase: one(knowledgeBase, {
		fields: [embedding.knowledgeBaseId],
		references: [knowledgeBase.id]
	}),
}));

export const templateStarsRelations = relations(templateStars, ({one}) => ({
	template: one(templates, {
		fields: [templateStars.templateId],
		references: [templates.id]
	}),
	user: one(user, {
		fields: [templateStars.userId],
		references: [user.id]
	}),
}));

export const templatesRelations = relations(templates, ({one, many}) => ({
	templateStars: many(templateStars),
	user: one(user, {
		fields: [templates.userId],
		references: [user.id]
	}),
	workflow: one(workflow, {
		fields: [templates.workflowId],
		references: [workflow.id]
	}),
}));

export const settingsRelations = relations(settings, ({one}) => ({
	user: one(user, {
		fields: [settings.userId],
		references: [user.id]
	}),
}));

export const userRateLimitsRelations = relations(userRateLimits, ({one}) => ({
	user: one(user, {
		fields: [userRateLimits.userId],
		references: [user.id]
	}),
}));

export const webhookRelations = relations(webhook, ({one}) => ({
	workflowBlock: one(workflowBlocks, {
		fields: [webhook.blockId],
		references: [workflowBlocks.id]
	}),
	workflow: one(workflow, {
		fields: [webhook.workflowId],
		references: [workflow.id]
	}),
}));

export const workflowScheduleRelations = relations(workflowSchedule, ({one}) => ({
	workflowBlock: one(workflowBlocks, {
		fields: [workflowSchedule.blockId],
		references: [workflowBlocks.id]
	}),
	workflow: one(workflow, {
		fields: [workflowSchedule.workflowId],
		references: [workflow.id]
	}),
}));

export const copilotCheckpointsRelations = relations(copilotCheckpoints, ({one}) => ({
	copilotChat: one(copilotChats, {
		fields: [copilotCheckpoints.chatId],
		references: [copilotChats.id]
	}),
	user: one(user, {
		fields: [copilotCheckpoints.userId],
		references: [user.id]
	}),
	workflow: one(workflow, {
		fields: [copilotCheckpoints.workflowId],
		references: [workflow.id]
	}),
}));