import fs from 'node:fs/promises'
import path from 'node:path'

export interface AgentDefinition {
  description: string
  tools?: string[]
  disallowedTools?: string[]
  prompt: string
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit'
}

interface AgentFrontmatter {
  name: string
  description: string
  tools?: string
  disallowedTools?: string
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit'
}

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const [, yamlStr, body] = match
  const frontmatter: Record<string, any> = {}

  // Simple YAML parser for key: value pairs
  yamlStr.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      frontmatter[key] = value
    }
  })

  return { frontmatter, body }
}

/**
 * Load custom agents from .claude/agents directory
 */
export async function loadAgents(claudeDir: string): Promise<Record<string, AgentDefinition>> {
  const agentsDir = path.join(claudeDir, 'agents')
  const agents: Record<string, AgentDefinition> = {}

  try {
    const files = await fs.readdir(agentsDir)

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      const filePath = path.join(agentsDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const { frontmatter, body } = parseFrontmatter(content)

      const agentMeta = frontmatter as AgentFrontmatter
      if (!agentMeta.name) continue

      agents[agentMeta.name] = {
        description: agentMeta.description || '',
        tools: agentMeta.tools ? agentMeta.tools.split(',').map((t) => t.trim()) : undefined,
        disallowedTools: agentMeta.disallowedTools
          ? agentMeta.disallowedTools.split(',').map((t) => t.trim())
          : undefined,
        prompt: body.trim(),
        model: agentMeta.model,
      }
    }

    console.log(`[LoadConfig] Loaded ${Object.keys(agents).length} custom agents:`, Object.keys(agents))
  } catch (error) {
    console.log('[LoadConfig] No custom agents found or error loading:', error)
  }

  return agents
}

/**
 * Load configuration from .claude directory
 */
export async function loadClaudeConfig(claudeDir: string) {
  const agents = await loadAgents(claudeDir)

  return {
    agents,
  }
}
