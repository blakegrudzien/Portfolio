/** Slack's four brand hues: the only colors in this project that are not
 * derived from the three design tokens in tokens.css. They are somebody
 * else's brand, not part of this site's palette, which is why they live
 * here rather than being added to the token file.
 *
 * In their own module because two places need them: the logo's paths in
 * pipelineGlyphs, and the unread badge drawn on the Slack node in
 * PipelineDiagram. The badge used to carry its own copy of the rose in a
 * stylesheet, in different letter case, which is two sources of truth for
 * one brand color and a quiet way for them to drift apart.
 */
export const SLACK_BRAND = {
  rose: '#E01E5A',
  blue: '#36C5F0',
  green: '#2EB67D',
  yellow: '#ECB22E',
} as const
