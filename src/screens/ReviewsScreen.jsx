import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import api from '../services/api';

const ReviewsScreen = ({ navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showAddReview, setShowAddReview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await api.getVendorReviews(1); // Mock vendor ID
      if (response.success) {
        setReviews(response.reviews);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load reviews');
    }
  };

  const submitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert('Missing Information', 'Please enter your review comment');
      return;
    }

    setLoading(true);
    try {
      const response = await api.submitReview({
        vendorId: 1, // Mock vendor ID
        rating: newReview.rating,
        comment: newReview.comment.trim(),
      });

      if (response.success) {
        Alert.alert('Success', 'Your review has been submitted!');
        setReviews([response.review, ...reviews]);
        setNewReview({ rating: 5, comment: '' });
        setShowAddReview(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => interactive && onRatingChange && onRatingChange(star)}
          >
            <Text style={[
              styles.star,
              star <= rating && styles.starFilled,
            ]}>
              ⭐
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReview = (review, index) => (
    <Card key={index} style={styles.reviewCard}>
      <CardContent>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>{review.userName}</Text>
            <Text style={styles.reviewDate}>{review.date}</Text>
          </View>
          {renderStars(review.rating)}
        </View>
        <Text style={styles.reviewComment}>{review.comment}</Text>
      </CardContent>
    </Card>
  );

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddReview(!showAddReview)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{reviews.length}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{averageRating}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>App Rating</Text>
          </View>
        </View>

        {/* Add Review Form */}
        {showAddReview && (
          <Card style={styles.addReviewCard}>
            <CardContent>
              <Text style={styles.formTitle}>Write a Review</Text>

              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Your Rating:</Text>
                {renderStars(newReview.rating, true, (rating) =>
                  setNewReview({...newReview, rating})
                )}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience..."
                value={newReview.comment}
                onChangeText={(comment) => setNewReview({...newReview, comment})}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#64748b"
              />

              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowAddReview(false)}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title="Submit Review"
                  onPress={submitReview}
                  loading={loading}
                  style={styles.submitButton}
                />
              </View>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>

          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Text style={styles.noReviewsIcon}>⭐</Text>
              <Text style={styles.noReviewsTitle}>No reviews yet</Text>
              <Text style={styles.noReviewsText}>
                Be the first to share your experience!
              </Text>
            </View>
          ) : (
            reviews.map(renderReview)
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  addReviewCard: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  ratingSection: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 24,
    color: '#e2e8f0',
    marginRight: 4,
  },
  starFilled: {
    color: '#fbbf24',
  },
  commentInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    height: 100,
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#ef4444',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#22c55e',
  },
  reviewsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  reviewCard: {
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748b',
  },
  reviewComment: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noReviewsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bottomPadding: {
    height: 20,
  },
});

export default ReviewsScreen;