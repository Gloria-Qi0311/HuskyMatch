import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import {
  addComment,
  fetchComments,
  toggleLike,
  toggleSave,
  type Comment,
  type Post,
} from '@/lib/posts-api';

type Props = {
  post: Post;
  viewerId: number;
  onChange: (next: Post) => void;
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function PostCard({ post, viewerId, onChange }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const handleLike = async () => {
    const liked = !post.likedByMe;
    onChange({
      ...post,
      likedByMe: liked,
      likeCount: post.likeCount + (liked ? 1 : -1),
    });
    try {
      const r = await toggleLike(post.id, viewerId);
      onChange({ ...post, likedByMe: r.liked, likeCount: r.likeCount });
    } catch {
      onChange(post);
    }
  };

  const handleSave = async () => {
    const saved = !post.savedByMe;
    onChange({
      ...post,
      savedByMe: saved,
      saveCount: post.saveCount + (saved ? 1 : -1),
    });
    try {
      const r = await toggleSave(post.id, viewerId);
      onChange({ ...post, savedByMe: r.saved, saveCount: r.saveCount });
    } catch {
      onChange(post);
    }
  };

  const handleExpand = async () => {
    if (!expanded && comments === null) {
      try {
        const list = await fetchComments(post.id);
        setComments(list);
      } catch {
        setError('Could not load comments.');
      }
    }
    setExpanded((x) => !x);
  };

  const handleAddComment = async () => {
    const body = commentBody.trim();
    if (!body) return;
    setPosting(true);
    setError('');
    try {
      const c = await addComment(post.id, viewerId, body);
      setComments((cs) => (cs ? [...cs, c] : [c]));
      onChange({ ...post, commentCount: post.commentCount + 1 });
      setCommentBody('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post comment.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <Avatar name={post.authorName} size={36} />
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{post.authorName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {post.authorSchool
              ? `${post.authorSchool} · ${timeAgo(post.createdAt)}`
              : timeAgo(post.createdAt)}
          </ThemedText>
        </View>
      </View>

      {post.body ? <ThemedText type="default">{post.body}</ThemedText> : null}

      {post.mediaUrl ? (
        <Image source={{ uri: post.mediaUrl }} style={styles.media} contentFit="cover" />
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={handleLike} style={styles.actionBtn}>
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={20}
            color={post.likedByMe ? Brand.coral : theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {String(post.likeCount)}
          </ThemedText>
        </Pressable>
        <Pressable onPress={handleExpand} style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {String(post.commentCount)}
          </ThemedText>
        </Pressable>
        <Pressable onPress={handleSave} style={styles.actionBtn}>
          <Ionicons
            name={post.savedByMe ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={post.savedByMe ? Brand.violet600 : theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {String(post.saveCount)}
          </ThemedText>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.commentSection}>
          {comments?.map((c) => (
            <View key={c.id} style={styles.comment}>
              <Avatar name={c.userName} size={28} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">{c.userName}</ThemedText>
                <ThemedText type="small">{c.body}</ThemedText>
              </View>
            </View>
          ))}
          {comments && comments.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No comments yet — be the first.
            </ThemedText>
          ) : null}
          <View style={styles.commentInputRow}>
            <TextInput
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder="Add a comment…"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.commentInput,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            <Pressable
              onPress={handleAddComment}
              disabled={posting || !commentBody.trim()}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.postLink}>
                {posting ? '…' : 'Post'}
              </ThemedText>
            </Pressable>
          </View>
          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerText: { flex: 1 },
  media: { width: '100%', height: 240, borderRadius: 14, marginTop: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.one },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentSection: { gap: Spacing.two, marginTop: Spacing.two },
  comment: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  postLink: { color: Brand.violet700 },
  pressed: { opacity: 0.7 },
  error: { color: '#E5484D' },
});
