import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { createPost, type CreatePostInput, type Post } from '@/lib/posts-api';

type Props = {
  authorId: number;
  authorName: string;
  onPosted: (post: Post) => void;
};

export function ComposePost({ authorId, authorName, onPosted }: Props) {
  const theme = useTheme();
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<CreatePostInput['media']>(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        name: asset.fileName ?? 'image.jpg',
        mime: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const handlePost = async () => {
    setError('');
    if (!body.trim() && !media) {
      setError('Write something or attach an image.');
      return;
    }
    setLoading(true);
    try {
      const post = await createPost({ authorId, body: body.trim(), media });
      onPosted(post);
      setBody('');
      setMedia(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {`Posting as ${authorName}`}
      </ThemedText>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="What's happening on campus?"
        placeholderTextColor={theme.textSecondary}
        multiline
        style={[styles.input, { color: theme.text }]}
      />
      {media ? (
        <View style={styles.mediaPreview}>
          <Image source={{ uri: media.uri }} style={styles.previewImg} contentFit="cover" />
          <Pressable onPress={() => setMedia(undefined)} style={styles.remove}>
            <ThemedText type="smallBold" style={styles.removeText}>
              ×
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={pickImage} style={styles.attach}>
          <ThemedText type="smallBold" style={styles.attachText}>
            + Photo
          </ThemedText>
        </Pressable>
        <View style={styles.flex} />
        <Button label="Post" onPress={handlePost} loading={loading} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 20, padding: Spacing.three, gap: Spacing.two },
  input: { minHeight: 60, fontSize: 16, textAlignVertical: 'top' },
  mediaPreview: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  previewImg: { width: '100%', height: 180 },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#FFFFFF', fontSize: 16 },
  attach: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    backgroundColor: Brand.violet100,
  },
  attachText: { color: Brand.violet700 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  error: { color: '#E5484D' },
});
