<template>
  <view class="container">
    <view class="header-wrapper" v-if="!isSearchMode">
      <!-- 顶部日期选择器 -->
      <view class="calendar-tab">
        <picker mode="date" fields="month" :value="formatYearMonth(selectedDate)" @change="onDateChange">
          <view class="calendar-tab-content">
            <text class="calendar-icon iconfont">📆</text>
            <text class="date-text">{{ selectedDate.getFullYear() }}年{{ selectedDate.getMonth() + 1 }}月</text>
            <text class="arrow-icon">▼</text>
          </view>
        </picker>
      </view>
      
      <!-- 顶部统计区域 -->
      <view class="header">
        <view class="total-expense">
          <text class="label">总支出</text>
          <text class="amount">¥{{ totalExpense.toFixed(2) }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索模式下的替代标题 -->
    <view class="search-header" v-if="isSearchMode">
      <view class="search-title">
        <text class="back-icon" @click="exitSearchMode">←</text>
        <text class="search-title-text">搜索全部记录</text>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-container" :class="{'search-mode': isSearchMode}">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索类别或备注..." 
          confirm-type="search"
          @confirm="handleSearch"
          class="search-input"
          @focus="onSearchFocus"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <text v-if="isSearchMode" class="search-tip">显示所有历史记录</text>
    </view>

    <!-- 记录列表 -->
    <view class="record-list-container" :class="{'search-mode': isSearchMode}">
      <view class="record-list-header">
        <view class="title-container">
          <text class="title">{{ isSearchMode ? '搜索结果' : '支出明细' }}</text>
          <text v-if="isSearchMode" class="search-mode-indicator">{{ displayRecords.length }}条</text>
        </view>
        <text class="count" v-if="displayRecords.length > 0 && !isSearchMode">共 {{ displayRecords.length }} 笔</text>
      </view>

      <view class="record-list">
        <view v-if="displayRecords.length === 0" class="empty-tip">
          <image src="@/static/images/empty.svg" mode="aspectFit" class="empty-image"></image>
          <text>{{ searchKeyword ? '没有找到匹配的记录' : '暂无记录' }}</text>
          <text class="empty-hint">{{ searchKeyword ? '请尝试其他关键词' : '点击下方"+"按钮添加记录' }}</text>
        </view>
        <view 
          v-else 
          v-for="(record, index) in displayRecords" 
          :key="record.id" 
          class="record-item-wrapper"
        >
          <view class="record-item-content" :class="{ 'slide-open': record.showActions }" @touchstart="touchStart(index)" @touchmove="touchMove(index, $event)" @touchend="touchEnd(index)">
            <view class="record-item">
              <view class="record-left">
                <view class="category-icon" :class="record.type">
                  {{ getCategoryIcon(record.category) }}
                </view>
                <view class="record-info">
                  <text class="category">{{ record.category }}</text>
                  <view class="record-details">
                    <text :class="['date', isSearchMode ? 'full-date' : '']">{{ formatDate(record.date, isSearchMode) }}</text>
                    <text class="remark" v-if="record.remark">{{ record.remark }}</text>
                    <text class="remark empty-remark" v-else>-</text>
                  </view>
                </view>
              </view>
              <view class="record-right">
                <text :class="['amount', record.type === 'expense' ? 'expense' : 'income']">
                  {{ record.type === 'expense' ? '-' : '+' }}¥{{ record.amount.toFixed(2) }}
                </text>
              </view>
            </view>
          </view>
          <view class="record-actions">
            <view class="action-btn edit-btn" @click="editRecord(record)">编辑</view>
            <view class="action-btn delete-btn" @click="showDeleteConfirm(record)">删除</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加按钮 -->
    <view class="add-button" @click="showAddModal">
      <text class="add-icon">+</text>
    </view>
  </view>
</template>

<script>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'

export default {
  setup() {
    const selectedDate = ref(new Date())
    const records = ref([])
    const allRecords = ref([])
    const totalExpense = ref(0)
    const startX = ref(0)
    const lastActiveIndex = ref(-1)
    const searchKeyword = ref('')
    const isSearchMode = ref(false)

    // 格式化日期为 YYYY-MM 字符串
    const formatYearMonth = (date) => {
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      return `${year}-${month}`
    }

    // 触摸开始
    const touchStart = (index) => {
      startX.value = 0
      
      // 关闭其他记录的滑动按钮
      if (lastActiveIndex.value !== -1 && lastActiveIndex.value !== index) {
        displayRecords.value[lastActiveIndex.value].showActions = false
      }
    }

    // 触摸移动
    const touchMove = (index, event) => {
      // 阻止默认滑动行为
      if (event.cancelable) {
        event.preventDefault()
      }
      
      const touch = event.touches[0]
      const currentX = touch.clientX
      
      // 第一次触摸时记录起始位置
      if (startX.value === 0) {
        startX.value = currentX
        return
      }
      
      const moveX = startX.value - currentX
      
      // 如果是向左滑动(正值)且距离大于30，打开操作按钮
      if (moveX > 30) {
        if (!displayRecords.value[index].showActions) {
          displayRecords.value[index].showActions = true
          lastActiveIndex.value = index
        }
      } 
      // 如果是向右滑动(负值)且幅度大于30，关闭操作按钮
      else if (moveX < -30) {
        if (displayRecords.value[index].showActions) {
          displayRecords.value[index].showActions = false
          lastActiveIndex.value = -1
        }
      }
    }

    // 触摸结束
    const touchEnd = (index) => {
      startX.value = 0
    }

    // 获取指定月份的数据
    const getRecordsByMonth = (date) => {
      const allRecords = uni.getStorageSync('records') || []
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      
      // 过滤出指定月份的数据
      const filteredRecords = allRecords.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getFullYear() === year && 
               recordDate.getMonth() + 1 === month
      })
      
      // 计算总支出
      totalExpense.value = filteredRecords
        .filter(record => record.type === 'expense')
        .reduce((sum, record) => sum + parseFloat(record.amount), 0)
      
      // 按日期排序（最新的在前面）并添加showActions属性
      return filteredRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => ({
          ...record,
          showActions: false
        }))
    }

    // 根据搜索关键词过滤记录
    const displayRecords = computed(() => {
      if (!searchKeyword.value) return records.value
      
      const keyword = searchKeyword.value.toLowerCase()
      
      // 如果正在搜索，使用所有记录进行过滤，而不仅仅是当月记录
      const recordsToSearch = isSearchMode.value ? allRecords.value : records.value
      
      return recordsToSearch.filter(record => 
        record.category.toLowerCase().includes(keyword) || 
        (record.remark && record.remark.toLowerCase().includes(keyword))
      )
    })

    // 搜索框聚焦时处理
    const onSearchFocus = () => {
      if (!isSearchMode.value) {
        isSearchMode.value = true
        loadAllRecords()
      }
    }

    // 退出搜索模式
    const exitSearchMode = () => {
      searchKeyword.value = ''
      isSearchMode.value = false
      loadRecords() // 重新加载当月记录
    }

    // 搜索处理
    const handleSearch = () => {
      // 关闭所有打开的操作按钮
      records.value.forEach(record => {
        record.showActions = false
      })
      lastActiveIndex.value = -1
      
      // 设置搜索模式
      if (searchKeyword.value.length > 0) {
        isSearchMode.value = true
        // 确保加载了所有记录
        if (allRecords.value.length === 0) {
          loadAllRecords()
        }
      } else {
        // 如果搜索框清空，退出搜索模式
        exitSearchMode()
      }
    }

    // 清空搜索
    const clearSearch = () => {
      searchKeyword.value = ''
      isSearchMode.value = false
      loadRecords() // 重新加载当月记录
    }

    // 格式化日期
    const formatDate = (dateString, showFullDate = false) => {
      if (!dateString) return ''
      
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ''
        
        if (showFullDate) {
          // 完整日期格式：YYYY-MM-DD
          const year = date.getFullYear()
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const day = date.getDate().toString().padStart(2, '0')
          return `${year}-${month}-${day}`
        } else {
          // 简短日期格式：MM-DD
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const day = date.getDate().toString().padStart(2, '0')
          return `${month}-${day}`
        }
      } catch (e) {
        console.error('日期格式化错误:', e)
        return ''
      }
    }

    // 根据类别返回对应图标
    const getCategoryIcon = (category) => {
      const iconMap = {
        '餐饮': '🍽️',
        '水果': '🍎',
        '零食': '🍪',
        '日用': '🛒',
        '数码': '💻',
        '住房': '🏠',
        '娱乐': '🎮',
        '汽车': '🚗',
        '通讯': '📱',
        '购物': '🛍️',
        '交通': '🚇',
        '医疗': '💊',
        '宠物': '🐱',
        '社交': '👥',
        '学习': '📚',
        '美容': '💄',
        '旅行': '✈️',
        '健身': '🏋️',
        '服饰': '👔',
        '礼物': '🎁',
        '水电': '💡',
        '办公': '📎',
        '维修': '🔧',
        '家电': '📺',
        '家居': '🛋️',
        '育儿': '👶',
        '教育': '🎓',
        '其他': '📝'
      }
      return iconMap[category] || '📝'
    }
    
    // 加载所有记录
    const loadAllRecords = () => {
      const storedRecords = uni.getStorageSync('records') || []
      
      // 按日期排序（最新的在前面）并添加showActions属性
      allRecords.value = storedRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => ({
          ...record,
          showActions: false
        }))
        
      console.log('全部记录已加载，共', allRecords.value.length, '条')
    }
    
    // 加载记录
    const loadRecords = () => {
      console.log('加载记录', formatYearMonth(selectedDate.value))
      
      // 重置左滑状态
      lastActiveIndex.value = -1
      
      // 加载所有记录
      const storedRecords = uni.getStorageSync('records') || []
      
      // 同时更新allRecords
      allRecords.value = storedRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => ({
          ...record,
          showActions: false  // 确保所有记录的操作按钮都是隐藏状态
        }))
      
      const year = selectedDate.value.getFullYear()
      const month = selectedDate.value.getMonth() + 1
      
      // 过滤出指定月份的数据
      const filteredRecords = storedRecords.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getFullYear() === year && 
               recordDate.getMonth() + 1 === month
      })
      
      // 计算总支出
      totalExpense.value = filteredRecords
        .filter(record => record.type === 'expense')
        .reduce((sum, record) => sum + parseFloat(record.amount), 0)
      
      // 按日期排序（最新的在前面）并添加showActions属性
      records.value = filteredRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => ({
          ...record,
          showActions: false  // 确保所有记录的操作按钮都是隐藏状态
        }))
        
      console.log('记录已更新，共', records.value.length, '条')
      
      // 如果还在搜索状态，重新触发搜索
      if (isSearchMode.value && searchKeyword.value) {
        handleSearch()
      }
    }

    // 改变日期时更新数据
    const onDateChange = (e) => {
      const dateArr = e.detail.value.split('-')
      selectedDate.value = new Date(dateArr[0], dateArr[1] - 1)
      
      // 如果不在搜索模式，加载当月记录
      if (!isSearchMode.value) {
        loadRecords()
      }
      
      // 如果在日期变更时正处于搜索状态，不要清空搜索关键词
      if (!isSearchMode.value) {
        searchKeyword.value = ''
      }
    }

    // 编辑记录
    const editRecord = (record) => {
      // 重置左滑状态
      if (lastActiveIndex.value !== -1) {
        displayRecords.value[lastActiveIndex.value].showActions = false
        lastActiveIndex.value = -1
      }
      
      uni.navigateTo({
        url: `/pages/add/index?id=${record.id}`
      })
    }

    // 显示删除确认对话框
    const showDeleteConfirm = (record) => {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: (res) => {
          if (res.confirm) {
            deleteRecord(record.id)
          }
        }
      })
    }

    // 删除记录
    const deleteRecord = (id) => {
      const allRecords = uni.getStorageSync('records') || []
      const updatedRecords = allRecords.filter(record => record.id !== id)
      uni.setStorageSync('records', updatedRecords)
      
      // 更新当前显示的记录
      records.value = getRecordsByMonth(selectedDate.value)
      
      // 触发记录更新事件，通知其他页面（如统计页面）更新数据
      uni.$emit('recordUpdated')
      
      // 显示删除成功提示
      uni.showToast({
        title: '删除成功',
        icon: 'success'
      })
    }

    const showAddModal = () => {
      uni.navigateTo({
        url: '/pages/add/index'
      })
    }

    // 记录更新事件处理
    const onRecordUpdated = (data = {}) => {
      console.log('记录已更新，重新加载数据')
      
      // 重置左滑状态
      lastActiveIndex.value = -1
      
      // 重新加载记录
      loadRecords()
      
      // 如果是导入或清空操作，显示对应提示
      if (data.isImport) {
        uni.showToast({
          title: '数据导入成功',
          icon: 'success',
          duration: 2000
        })
      } else if (data.isCleared) {
        uni.showToast({
          title: '数据已清空',
          icon: 'success',
          duration: 2000
        })
      } else if (data.isRestore) {
        uni.showToast({
          title: '数据已恢复',
          icon: 'success',
          duration: 2000
        })
      }
    }

    // 页面显示时更新数据
    const onPageShow = () => {
      // 重置左滑状态
      if (lastActiveIndex.value !== -1 && displayRecords.value[lastActiveIndex.value]) {
        displayRecords.value[lastActiveIndex.value].showActions = false
        lastActiveIndex.value = -1
      }
      
      // 延迟执行，确保全局事件执行完毕
      nextTick(() => {
        loadRecords()
      })
    }

    // 页面加载时获取数据
    onMounted(() => {
      // 获取当月记录
      loadRecords()
      
      // 注册记录更新事件监听
      uni.$on('recordUpdated', onRecordUpdated)
      
      // 注册页面显示事件监听
      uni.$on('onShow', onPageShow)
    })

    // 页面卸载时移除事件监听
    onUnmounted(() => {
      uni.$off('recordUpdated', onRecordUpdated)
      uni.$off('onShow', onPageShow)
    })

    // 下拉刷新处理
    const onPullDownRefresh = () => {
      console.log('执行下拉刷新...')
      
      // 重新加载记录
      loadRecords()
      
      // 清空搜索模式和关键词
      searchKeyword.value = ''
      isSearchMode.value = false
      
      // 显示提示
      uni.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1000
      })
      
      // 停止下拉刷新动画
      setTimeout(() => {
        uni.stopPullDownRefresh()
      }, 500)
    }

    return {
      selectedDate,
      records,
      allRecords,
      displayRecords,
      totalExpense,
      formatYearMonth,
      formatDate,
      getCategoryIcon,
      onDateChange,
      touchStart,
      touchMove,
      touchEnd,
      editRecord,
      showDeleteConfirm,
      deleteRecord,
      showAddModal,
      searchKeyword,
      handleSearch,
      clearSearch,
      onPullDownRefresh,
      isSearchMode,
      onSearchFocus,
      exitSearchMode
    }
  },
  
  // 添加页面显示生命周期
  onShow() {
    // 刷新数据
    this.loadRecords && this.loadRecords()
  },
  
  // 添加下拉刷新生命周期钩子
  onPullDownRefresh() {
    console.log('触发下拉刷新...')
    
    // 调用setup中定义的刷新方法
    this.onPullDownRefresh()
  }
}
</script>

<style>
.container {
  padding: 20rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.header-wrapper {
  position: relative;
  margin-bottom: 20rpx;
}

.calendar-tab {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.calendar-tab-content {
  background-color: #ffffff;
  min-width: 180rpx;
  height: 70rpx;
  border-radius: 0 0 35rpx 35rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 15rpx rgba(24, 144, 255, 0.2);
  padding: 0 25rpx;
  transition: all 0.3s ease;
}

.calendar-icon {
  font-size: 32rpx;
  color: #1890ff;
  margin-right: 10rpx;
}

.date-text {
  font-size: 30rpx;
  color: #1890ff;
  font-weight: 500;
}

.arrow-icon {
  font-size: 20rpx;
  color: #1890ff;
  margin-left: 8rpx;
  opacity: 0.7;
}

.header {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  padding: 80rpx 30rpx 40rpx;
  border-radius: 20rpx;
  color: #fff;
  box-shadow: 0 10rpx 20rpx rgba(24, 144, 255, 0.15);
}

.total-expense {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20rpx;
}

.label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 15rpx;
  letter-spacing: 2rpx;
}

.amount {
  font-size: 60rpx;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 2rpx 5rpx rgba(0, 0, 0, 0.1);
}

/* 搜索模式下的标题 */
.search-header {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  padding: 30rpx;
  border-radius: 20rpx;
  color: #fff;
  box-shadow: 0 10rpx 20rpx rgba(24, 144, 255, 0.15);
  margin-bottom: 20rpx;
}

.search-title {
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 36rpx;
  color: #fff;
  margin-right: 20rpx;
  font-weight: bold;
}

.search-title-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}

/* 搜索框样式 */
.search-container {
  margin: 20rpx 0;
  transition: all 0.3s ease;
}

.search-container.search-mode {
  margin-top: 0;
}

.search-box {
  background-color: #fff;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  padding: 0 25rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.search-icon {
  font-size: 32rpx;
  color: #999;
  margin-right: 15rpx;
}

.search-input {
  flex: 1;
  height: 70rpx;
  font-size: 28rpx;
  color: #333;
}

.clear-icon {
  font-size: 28rpx;
  color: #999;
  padding: 0 10rpx;
}

.search-tip {
  display: block;
  font-size: 24rpx;
  color: #1890ff;
  margin-top: 10rpx;
  margin-left: 20rpx;
}

.record-list-container {
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.record-list-container.search-mode {
  min-height: calc(100vh - 220rpx);
}

.record-list-container.search-mode .record-item {
  border-left: 6rpx solid #1890ff;
}

.record-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 0;
}

.title-container {
  display: flex;
  align-items: center;
}

.title {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
}

.count {
  font-size: 24rpx;
  color: #999;
}

.search-mode-indicator {
  font-size: 24rpx;
  color: #1890ff;
  margin-left: 10rpx;
}

.record-list {
  padding: 10rpx 20rpx;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

.empty-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #bbb;
  margin-top: 15rpx;
}

.record-item-wrapper {
  position: relative;
  overflow: hidden;
  width: 100%;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
}

.record-item-content {
  position: relative;
  z-index: 2;
  background-color: #fff;
  transition: all 0.3s ease;
  width: 100%;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 0;
  height: 100%;
}

.record-item-content.slide-open {
  transform: translateX(-180rpx);
}

.record-item {
  display: flex;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 0;
  background-color: #fff;
  border-radius: 16rpx;
  min-height: 80rpx;
}

.record-actions {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  height: auto;
  display: flex;
  z-index: 1;
  overflow: hidden;
  width: 180rpx;
  border-radius: 0 16rpx 16rpx 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
  flex: 1;
  height: auto;
  transition: all 0.2s ease;
}

.action-btn:active {
  opacity: 0.8;
}

.edit-btn {
  background-color: #1890ff;
}

.delete-btn {
  background-color: #ff4d4f;
}

.record-left {
  display: flex;
  align-items: center;
}

.category-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20rpx;
  font-size: 40rpx;
}

.category-icon.expense {
  background-color: #ffeaea;
}

.category-icon.income {
  background-color: #e6f7ff;
}

.record-info {
  display: flex;
  flex-direction: column;
  width: 350rpx;
}

.search-mode .record-info {
  width: 320rpx;
}

.category {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
  font-weight: 500;
}

.record-details {
  display: flex;
  align-items: center;
}

.date {
  font-size: 24rpx;
  color: #999;
  margin-right: 12rpx;
}

.date.full-date {
  background-color: #f0f7ff;
  color: #1890ff;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}

.remark {
  font-size: 24rpx;
  color: #999;
  background-color: #f5f5f5;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  max-width: 220rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-remark {
  background-color: transparent;
  opacity: 0.5;
}

.record-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.search-mode .record-item .record-right {
  margin-left: 10rpx;
}

.amount {
  font-size: 36rpx;
  font-weight: bold;
}

.expense {
  color: #ff4d4f;
}

.income {
  color: #52c41a;
}

.add-button {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 90rpx;
  height: 90rpx;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 6rpx 16rpx rgba(24, 144, 255, 0.3);
  z-index: 999;
}

.add-icon {
  color: #fff;
  font-size: 48rpx;
  font-weight: bold;
}

/* 添加下拉刷新动画相关样式 */
.refresh-indicator {
  text-align: center;
  height: 80rpx;
  line-height: 80rpx;
  color: #999;
}
</style>
