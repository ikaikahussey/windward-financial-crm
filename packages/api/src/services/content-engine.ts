import Anthropic from '@anthropic-ai/sdk';
import slugify from 'slugify';
import { db } from '../db';
import { blogPosts, emailTemplates, newsletterSubscribers } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

const anthropic = new Anthropic();

const BLOG_TOPICS = [
  'Understanding your Hawaii ERS pension and how to maximize your retirement',
  'Why DOE teachers need life insurance beyond their employer-provided coverage',
  'How 403(b) plans work for Hawaii state employees: SPDA vs FPDA explained',
  'The retirement income gap: what Hawaii teachers should know before retiring',
  'Life insurance 101 for Hawaii government employees: term vs permanent',
  'How to build a retirement bridge strategy for early retirees',
  'Understanding EUTF benefits and what they mean for your retirement planning',
  'Top 5 financial planning mistakes Hawaii state employees make',
  'How inflation impacts your ERS pension and what to do about it',
  'When to start planning for retirement as a Hawaii DOE teacher',
  'Indexed Universal Life Insurance: is it right for Hawaii state employees?',
  'How to calculate your actual retirement income need in Hawaii',
];

/**
 * Generate a blog post draft using Claude AI.
 * Picks a topic, generates content, and saves as an unpublished blog post.
 */
export async function generateBlogDraft(): Promise<void> {
  // Pick a topic — rotate through the list based on existing post count
  const existingPosts = await db
    .select({ id: blogPosts.id })
    .from(blogPosts);
  const topicIndex = existingPosts.length % BLOG_TOPICS.length;
  const topic = BLOG_TOPICS[topicIndex];

  const systemPrompt = `You are a content writer for Windward Financial Group, a financial planning firm in Hawaii that specializes in helping state employees (especially DOE teachers and staff) with retirement planning, life insurance, and 403(b) strategies.

Write educational, SEO-friendly blog posts that:
- Are written in a warm, approachable tone appropriate for Hawaii's culture
- Use "we" when referring to Windward Financial Group
- Include practical, actionable advice
- Reference Hawaii-specific benefits (ERS, EUTF, state 403b plans)
- Are 800-1200 words
- Include a compelling introduction and conclusion with a call to action
- Do NOT include investment return guarantees or specific financial advice
- Are formatted in clean HTML with <h2>, <h3>, <p>, <ul>/<li> tags

Respond with a JSON object containing:
- "title": the blog post title
- "excerpt": a 1-2 sentence summary for previews
- "body": the full HTML content
- "metaDescription": SEO meta description (under 160 characters)
- "tags": array of 3-5 relevant tags`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Write a blog post about: "${topic}"`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock) {
    console.error('No text content in blog generation response');
    return;
  }

  let parsed: {
    title: string;
    excerpt: string;
    body: string;
    metaDescription: string;
    tags: string[];
  };

  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonText = textBlock.text;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error('Failed to parse blog generation response:', err);
    return;
  }

  const slug = slugify(parsed.title, { lower: true, strict: true });

  // Check for duplicate slug
  const existingSlug = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  const finalSlug = existingSlug.length > 0
    ? `${slug}-${Date.now()}`
    : slug;

  await db.insert(blogPosts).values({
    slug: finalSlug,
    title: parsed.title,
    excerpt: parsed.excerpt,
    body: parsed.body,
    metaDescription: parsed.metaDescription,
    tags: parsed.tags,
    isPublished: false,
  });

  console.log(`Generated blog draft: "${parsed.title}" (slug: ${finalSlug})`);
}

/**
 * Generate a newsletter from recent published blog posts.
 * Creates an email template that can be sent to subscribers.
 */
export async function generateNewsletter(): Promise<void> {
  // Fetch recent published blog posts (last 14 days)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentPosts = await db
    .select({
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      slug: blogPosts.slug,
    })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(5);

  if (recentPosts.length === 0) {
    console.log('No recent published posts to include in newsletter');
    return;
  }

  const postsContext = recentPosts
    .map(
      (post) =>
        `- Title: "${post.title}"\n  Excerpt: ${post.excerpt || 'N/A'}\n  URL: /blog/${post.slug}`
    )
    .join('\n');

  // Get subscriber count for context
  const subscribers = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribedAt, null as any));

  const systemPrompt = `You are writing a biweekly email newsletter for Windward Financial Group, a financial planning firm in Hawaii serving state employees.

The newsletter should:
- Have a warm, personal tone
- Include a brief personal greeting using {{first_name}} merge tag
- Summarize recent blog posts with links
- Include one practical financial tip
- End with a call to action to schedule a consultation
- Be formatted in clean HTML suitable for email (tables for layout, inline styles)
- Use the scheduling link: {{scheduling_link}}
- Be signed by the Windward Financial Group team

Respond with a JSON object containing:
- "subject": the email subject line
- "body": the full HTML email content`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate a newsletter featuring these recent blog posts:\n\n${postsContext}\n\nWe have ${subscribers.length} subscribers. Today's date is ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock) {
    console.error('No text content in newsletter generation response');
    return;
  }

  let parsed: { subject: string; body: string };
  try {
    let jsonText = textBlock.text;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error('Failed to parse newsletter generation response:', err);
    return;
  }

  // Save as an email template
  const templateName = `Newsletter ${new Date().toISOString().slice(0, 10)}`;

  await db.insert(emailTemplates).values({
    name: templateName,
    subject: parsed.subject,
    body: parsed.body,
  });

  console.log(`Generated newsletter template: "${templateName}"`);
}
