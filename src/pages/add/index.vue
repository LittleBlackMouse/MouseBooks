<template>
  <view class="add-container">
    <view class="form-card">
      <view class="amount-section">
        <text class="amount-label">金额</text>
        <view class="amount-input-container">
          <text class="currency-symbol">¥</text>
          <input 
            type="digit" 
            v-model="amount" 
            placeholder="0.00" 
            class="amount-input"
            focus
          />
        </view>
      </view>

      <view class="form-item date-item">
        <text class="label">日期</text>
        <picker 
          mode="multiSelector" 
          :value="dateArray.indexes" 
          :range="dateArray.pickers"
          @change="onDatePickerChange"
          @columnchange="onDateColumnChange"
          class="date-picker"
        >
          <view class="calendar-tab-content">
            <text class="calendar-icon">📆</text>
            <text class="date-text">{{ formatDisplayDate(selectedDate) }}</text>
            <text class="arrow-icon">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item remark-item">
        <text class="label">备注</text>
        <input 
          v-model="remark" 
          placeholder="添加备注..." 
          class="input"
          maxlength="30"
        />
      </view>
    </view>

    <view class="category-section">
      <view class="section-header">
        <text class="section-title">选择类别</text>
        <text class="section-action" @click="showCategoryManager">管理类别</text>
      </view>
      <view class="tips" v-if="!isManagingCategories">
        <text class="tip-text">点击选择类别，长按可拖动排序</text>
      </view>
      <view class="category-grid" v-if="!isManagingCategories">
        <view 
          v-for="(item, index) in displayCategories" 
          :key="index"
          class="category-item"
          :class="{ active: selectedCategory === item.name }"
          @click="selectCategory(item.name)"
          @longpress="startDrag(index)"
          :style="getDragStyle(index)"
        >
          <view class="category-icon-wrapper">
            <text class="category-icon">{{ item.icon }}</text>
          </view>
          <text class="category-name">{{ item.name }}</text>
        </view>
      </view>
      
      <!-- 类别管理界面 -->
      <view class="category-manager" v-if="isManagingCategories">
        <view class="manager-section">
          <text class="manager-title">当前显示</text>
          <view class="category-grid">
            <view 
              v-for="(item, index) in displayCategories" 
              :key="index"
              class="category-item category-manageable"
            >
              <view class="category-icon-wrapper">
                <text class="category-icon">{{ item.icon }}</text>
                <view class="delete-icon" @click="removeCategory(index)">×</view>
              </view>
              <text class="category-name">{{ item.name }}</text>
            </view>
          </view>
        </view>
        
        <view class="manager-section">
          <text class="manager-title">可添加类别</text>
          <view class="category-grid">
            <view 
              v-for="(item, index) in availableCategories" 
              :key="index"
              class="category-item category-manageable"
              @click="addCategory(item)"
            >
              <view class="category-icon-wrapper">
                <text class="category-icon">{{ item.icon }}</text>
                <view class="add-icon" @click.stop="addCategory(item)">+</view>
              </view>
              <text class="category-name">{{ item.name }}</text>
            </view>
            
            <!-- 自定义类别按钮 -->
            <view class="category-item" @click="showCustomCategoryModal">
              <view class="category-icon-wrapper custom-category">
                <text class="category-icon">✏️</text>
              </view>
              <text class="category-name">自定义</text>
            </view>
          </view>
        </view>
        
        <button class="save-button" @click="saveCategories">保存并返回</button>
      </view>
    </view>

    <button class="save-button" @click="saveRecord" v-if="!isManagingCategories">保存</button>
    
    <!-- 自定义类别弹窗 -->
    <view class="custom-category-modal" v-if="showModal">
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">添加自定义类别</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="label">类别名称</text>
            <input v-model="customCategory.name" placeholder="输入类别名称" class="input" maxlength="4" />
          </view>
          <view class="form-item">
            <text class="label">选择图标</text>
            <scroll-view scroll-x class="icon-scroll">
              <view 
                v-for="(icon, i) in iconList" 
                :key="i"
                class="icon-item"
                :class="{ 'icon-selected': customCategory.icon === icon }"
                @click="customCategory.icon = icon"
              >
                {{ icon }}
              </view>
            </scroll-view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @click="showModal = false">取消</button>
          <button class="modal-btn confirm-btn" @click="addCustomCategory">确认</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, computed, reactive } from 'vue'

export default {
  setup() {
    const amount = ref('')
    const selectedCategory = ref('')
    const remark = ref('')
    const selectedDate = ref(new Date().toISOString().split('T')[0]) // 当前日期，格式为YYYY-MM-DD
    const isEditing = ref(false)
    const recordId = ref('')
    
    // 日期选择器数组
    const dateArray = reactive({
      pickers: [
        Array.from({length: 21}, (_, i) => (new Date().getFullYear() - 10 + i).toString() + '年'),
        Array.from({length: 12}, (_, i) => (i + 1).toString() + '月'),
        Array.from({length: 31}, (_, i) => (i + 1).toString() + '日')
      ],
      indexes: [10, new Date().getMonth(), new Date().getDate() - 1] // 默认选中当前日期
    })
    
    // 根据年月更新日期数组中的天数
    const updateDays = (year, month) => {
      const days = new Date(year, month, 0).getDate()
      dateArray.pickers[2] = Array.from({length: days}, (_, i) => (i + 1).toString() + '日')
      
      // 如果当前选择的日期超过了新月份的最大天数，则调整为最大天数
      if (dateArray.indexes[2] >= days) {
        dateArray.indexes[2] = days - 1
      }
    }
    
    // 列变化时触发
    const onDateColumnChange = (e) => {
      const column = e.detail.column
      const value = e.detail.value
      
      dateArray.indexes[column] = value
      
      // 如果年或月变化，需要更新天数
      if (column === 0 || column === 1) {
        const year = parseInt(dateArray.pickers[0][dateArray.indexes[0]])
        const month = parseInt(dateArray.pickers[1][dateArray.indexes[1]])
        updateDays(year, month)
      }
    }
    
    // 日期选择器变化
    const onDatePickerChange = (e) => {
      const values = e.detail.value
      dateArray.indexes = values
      
      // 从选择器值中提取年月日
      const year = parseInt(dateArray.pickers[0][values[0]])
      const month = parseInt(dateArray.pickers[1][values[1]])
      const day = parseInt(dateArray.pickers[2][values[2]])
      
      // 创建日期对象并设置时区偏移，修复少一天的问题
      const newDate = new Date(year, month - 1, day)
      const isoDate = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      selectedDate.value = isoDate
    }
    
    // 类别管理相关
    const isManagingCategories = ref(false)
    const showModal = ref(false)
    const customCategory = ref({ name: '', icon: '📝' })
    const dragIndex = ref(-1)
    const dragPosition = ref({ x: 0, y: 0 })
    
    // 完整的类别列表
    const allCategories = ref([
      { name: '餐饮', icon: '🍽️' },
      { name: '水果', icon: '🍎' },
      { name: '零食', icon: '🍪' },
      { name: '日用', icon: '🛒' },
      { name: '数码', icon: '💻' },
      { name: '住房', icon: '🏠' },
      { name: '娱乐', icon: '🎮' },
      { name: '汽车', icon: '🚗' },
      { name: '通讯', icon: '📱' },
      { name: '购物', icon: '🛍️' },
      { name: '交通', icon: '🚇' },
      { name: '医疗', icon: '💊' },
      { name: '宠物', icon: '🐱' },
      { name: '社交', icon: '👥' },
      { name: '学习', icon: '📚' },
      { name: '美容', icon: '💄' },
      { name: '旅行', icon: '✈️' },
      { name: '健身', icon: '🏋️' },
      { name: '服饰', icon: '👔' },
      { name: '礼物', icon: '🎁' },
      { name: '水电', icon: '💡' },
      { name: '办公', icon: '📎' },
      { name: '维修', icon: '🔧' },
      { name: '家电', icon: '📺' },
      { name: '家居', icon: '🛋️' },
      { name: '育儿', icon: '👶' },
      { name: '教育', icon: '🎓' },
      { name: '其他', icon: '📝' }
    ])
    
    // 用户选择显示的类别（初始加载时从本地存储获取）
    const displayCategories = ref([])
    
    // 可供添加的类别
    const availableCategories = computed(() => {
      const displayNames = displayCategories.value.map(item => item.name)
      return allCategories.value.filter(item => !displayNames.includes(item.name))
    })
    
    // 所有可用的图标
    const iconList = ref([
      '🍽️', '🍎', '🍪', '🛒', '💻', '🏠', '🎮', '🚗', '📱', '🛍️', 
      '🚇', '💊', '🐱', '👥', '📚', '📝', '💄', '✈️', '🏋️', '👔', 
      '🎁', '💡', '📎', '🔧', '📺', '🛋️', '👶', '🎓', '☕', '🍕',
      '🍰', '📷', '🎬', '🎵', '🎨', '🌳', '⚽', '🎹', '🚢', '🗓️'
    ])
    
    // 初始化类别
    const initCategories = () => {
      try {
        // 尝试从本地存储加载用户自定义的类别
        const savedCategories = uni.getStorageSync('userCategories')
        if (savedCategories && Array.isArray(JSON.parse(savedCategories))) {
          displayCategories.value = JSON.parse(savedCategories)
        } else {
          // 第一次使用或数据被清空，设置默认显示的类别
          // 显示指定的16个分类
          const defaultCategories = ['餐饮', '水果', '零食', '日用', '数码', '住房', '娱乐', '汽车', '通讯', '购物', '交通', '医疗', '宠物', '社交', '学习', '其他'];
          displayCategories.value = allCategories.value.filter(cat => defaultCategories.includes(cat.name));
          saveCategoriesToStorage()
        }
      } catch (e) {
        console.error('加载类别失败', e)
        // 默认显示指定的16个分类
        const defaultCategories = ['餐饮', '水果', '零食', '日用', '数码', '住房', '娱乐', '汽车', '通讯', '购物', '交通', '医疗', '宠物', '社交', '学习', '其他'];
        displayCategories.value = allCategories.value.filter(cat => defaultCategories.includes(cat.name));
      }
    }
    
    // 保存用户类别到本地存储
    const saveCategoriesToStorage = () => {
      try {
        uni.setStorageSync('userCategories', JSON.stringify(displayCategories.value))
      } catch (e) {
        console.error('保存类别失败', e)
      }
    }
    
    // 显示类别管理界面
    const showCategoryManager = () => {
      isManagingCategories.value = true
    }
    
    // 保存类别设置并返回
    const saveCategories = () => {
      saveCategoriesToStorage()
      isManagingCategories.value = false
    }
    
    // 从显示列表中移除类别
    const removeCategory = (index) => {
      if (displayCategories.value.length <= 1) {
        uni.showToast({
          title: '至少保留一个类别',
          icon: 'none'
        })
        return
      }
      displayCategories.value.splice(index, 1)
    }
    
    // 添加类别到显示列表
    const addCategory = (category) => {
      if (displayCategories.value.length >= 20) {
        uni.showToast({
          title: '最多添加20个类别',
          icon: 'none'
        })
        return
      }
      displayCategories.value.push({...category})
    }
    
    // 显示自定义类别弹窗
    const showCustomCategoryModal = () => {
      customCategory.value = { name: '', icon: '📝' }
      showModal.value = true
    }
    
    // 添加自定义类别
    const addCustomCategory = () => {
      if (!customCategory.value.name.trim()) {
        uni.showToast({
          title: '请输入类别名称',
          icon: 'none'
        })
        return
      }
      
      // 检查名称是否已存在
      const existingCategory = allCategories.value.find(
        item => item.name === customCategory.value.name
      )
      
      if (existingCategory) {
        // 如果名称存在于全局列表但不在显示列表，则添加到显示列表
        if (!displayCategories.value.find(item => item.name === customCategory.value.name)) {
          addCategory(existingCategory)
        } else {
          uni.showToast({
            title: '该类别已存在',
            icon: 'none'
          })
          return
        }
      } else {
        // 添加到全局列表和显示列表
        const newCategory = {
          name: customCategory.value.name,
          icon: customCategory.value.icon
        }
        allCategories.value.push(newCategory)
        addCategory(newCategory)
      }
      
      showModal.value = false
    }
    
    // 开始拖动
    const startDrag = (index) => {
      dragIndex.value = index
      
      // 添加拖动感应
      uni.vibrateShort({
        success: function() {
          console.log('震动成功')
        }
      })
      
      // 监听触摸移动
      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', endDrag)
    }
    
    // 触摸移动
    const onTouchMove = (event) => {
      if (dragIndex.value >= 0) {
        event.preventDefault()
        
        // 计算新位置
        const touch = event.touches[0]
        dragPosition.value = {
          x: touch.clientX,
          y: touch.clientY
        }
        
        // 检测是否需要交换位置
        const elements = document.querySelectorAll('.category-item')
        if (elements.length > 0 && dragIndex.value < elements.length) {
          const draggedRect = elements[dragIndex.value].getBoundingClientRect()
          
          for (let i = 0; i < elements.length; i++) {
            if (i !== dragIndex.value) {
              const rect = elements[i].getBoundingClientRect()
              
              // 检测重叠
              if (
                dragPosition.value.x >= rect.left &&
                dragPosition.value.x <= rect.right &&
                dragPosition.value.y >= rect.top &&
                dragPosition.value.y <= rect.bottom
              ) {
                // 交换位置
                const temp = {...displayCategories.value[dragIndex.value]}
                displayCategories.value[dragIndex.value] = {...displayCategories.value[i]}
                displayCategories.value[i] = temp
                dragIndex.value = i
                break
              }
            }
          }
        }
      }
    }
    
    // 结束拖动
    const endDrag = () => {
      dragIndex.value = -1
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', endDrag)
    }
    
    // 获取拖动样式
    const getDragStyle = (index) => {
      if (index === dragIndex.value) {
        return {
          opacity: '0.7',
          transform: 'scale(1.1)',
          zIndex: '999'
        }
      }
      return {}
    }

    const selectCategory = (category) => {
      selectedCategory.value = category
    }

    const onDateChange = (e) => {
      selectedDate.value = e.detail.value
    }

    const formatDisplayDate = (dateString) => {
      if (!dateString) return '请选择日期'
      
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      
      return `${year}年${month}月${day}日`
    }

    const resetForm = () => {
      amount.value = ''
      selectedCategory.value = ''
      remark.value = ''
      
      // 获取当前日期，考虑时区
      const today = new Date()
      const isoDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      selectedDate.value = isoDate
      
      // 重置日期选择器
      const currentDate = new Date()
      dateArray.indexes = [
        10, // 当前年份在数组中的索引（从当前年份-10开始，所以当前年份是索引10）
        currentDate.getMonth(),
        currentDate.getDate() - 1
      ]
      
      isEditing.value = false
      recordId.value = ''
    }

    const saveRecord = () => {
      // 检查金额是否有效
      if (!amount.value || isNaN(parseFloat(amount.value)) || parseFloat(amount.value) <= 0) {
        uni.showToast({
          title: '请输入有效的金额',
          icon: 'none'
        })
        return
      }
      
      // 检查是否选择了类别
      if (!selectedCategory.value) {
        uni.showToast({
          title: '请选择类别',
          icon: 'none'
        })
        return
      }
      
      // 获取记录列表
      const records = uni.getStorageSync('records') || []
      
      // 创建新记录对象
      const newRecord = {
        id: isEditing.value ? recordId.value : Date.now().toString(), // 使用时间戳作为ID
        amount: parseFloat(amount.value),
        category: selectedCategory.value,
        date: selectedDate.value,
        remark: remark.value,
        type: 'expense', // 目前只支持支出类型
        createdAt: new Date().toISOString()
      }
      
      if (isEditing.value) {
        // 更新记录
        const index = records.findIndex(item => item.id === recordId.value)
        if (index !== -1) {
          records[index] = { ...records[index], ...newRecord }
        }
      } else {
        // 添加新记录
        records.push(newRecord)
      }
      
      // 保存到本地存储
      uni.setStorageSync('records', records)
      
      // 触发记录更新事件
      uni.$emit('recordUpdated')
      
      // 显示成功提示
      uni.showToast({
        title: isEditing.value ? '记录已更新' : '记录已保存',
        icon: 'success'
      })
      
      // 返回上一页
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    }

    return {
      amount,
      selectedCategory,
      remark,
      selectedDate,
      displayCategories,
      selectCategory,
      onDateChange,
      formatDisplayDate,
      saveRecord,
      isEditing,
      recordId,
      // 新增的日期选择器相关属性和方法
      dateArray,
      onDatePickerChange,
      onDateColumnChange,
      // 类别管理相关
      isManagingCategories,
      showCategoryManager,
      availableCategories,
      removeCategory,
      addCategory,
      saveCategories,
      showModal,
      customCategory,
      iconList,
      showCustomCategoryModal,
      addCustomCategory,
      dragIndex,
      startDrag,
      getDragStyle
    }
  },
  
  // 页面生命周期钩子
  onLoad(options) {
    console.log('添加页面加载', options)
    
    // 初始化类别列表
    this.initCategories()
    
    // 初始化日期选择器
    this.initDatePicker && this.initDatePicker()
    
    // 如果传入了id参数，说明是编辑模式
    if (options && options.id) {
      this.isEditing = true
      this.recordId = options.id
      
      // 获取所有记录
      const allRecords = uni.getStorageSync('records') || []
      
      // 查找要编辑的记录
      const record = allRecords.find(item => item.id === options.id)
      
      if (record) {
        // 填充表单
        this.amount = record.amount.toString()
        this.selectedCategory = record.category
        this.remark = record.remark || ''
        this.selectedDate = record.date
        
        // 更新日期选择器的索引
        if (this.selectedDate) {
          const date = new Date(this.selectedDate)
          if (this.dateArray) {
            this.dateArray.indexes = [
              date.getFullYear() - (new Date().getFullYear() - 10), // 计算年份在数组中的索引
              date.getMonth(),
              date.getDate() - 1
            ]
          }
        }
        
        // 更新页面标题
        uni.setNavigationBarTitle({
          title: '编辑记录'
        })
      }
    } else {
      // 重置表单，新建模式
      this.resetForm()
    }
  },
  onShow() {
    console.log('添加页面显示')
    // 如果不是编辑模式，重置表单
    if (!this.isEditing) {
      this.resetForm()
    }
  },
  methods: {
    resetForm() {
      this.amount = ''
      this.selectedCategory = ''
      this.remark = ''
      
      // 获取当前日期，考虑时区
      const today = new Date()
      const isoDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      this.selectedDate = isoDate
      
      // 重置日期选择器索引
      if (this.dateArray) {
        const currentDate = new Date()
        this.dateArray.indexes = [
          10, // 当前年份在数组中的索引
          currentDate.getMonth(),
          currentDate.getDate() - 1
        ]
      }
      
      this.isEditing = false
      this.recordId = ''
    },
    
    // 初始化日期选择器
    initDatePicker() {
      if (!this.dateArray) return
      
      // 根据当前选择的年月更新天数
      const currentYear = parseInt(this.dateArray.pickers[0][this.dateArray.indexes[0]])
      const currentMonth = parseInt(this.dateArray.pickers[1][this.dateArray.indexes[1]])
      const days = new Date(currentYear, currentMonth, 0).getDate()
      
      this.dateArray.pickers[2] = Array.from({length: days}, (_, i) => (i + 1).toString() + '日')
    },
    
    // 初始化类别列表
    initCategories() {
      // 创建allCategories引用，确保方法可以访问到setup中定义的类别列表
      const allCategories = [
        { name: '餐饮', icon: '🍽️' },
        { name: '水果', icon: '🍎' },
        { name: '零食', icon: '🍪' },
        { name: '日用', icon: '🛒' },
        { name: '数码', icon: '💻' },
        { name: '住房', icon: '🏠' },
        { name: '娱乐', icon: '🎮' },
        { name: '汽车', icon: '🚗' },
        { name: '通讯', icon: '📱' },
        { name: '购物', icon: '🛍️' },
        { name: '交通', icon: '🚇' },
        { name: '医疗', icon: '💊' },
        { name: '宠物', icon: '🐱' },
        { name: '社交', icon: '👥' },
        { name: '学习', icon: '📚' },
        { name: '美容', icon: '💄' },
        { name: '旅行', icon: '✈️' },
        { name: '健身', icon: '🏋️' },
        { name: '服饰', icon: '👔' },
        { name: '礼物', icon: '🎁' },
        { name: '水电', icon: '💡' },
        { name: '办公', icon: '📎' },
        { name: '维修', icon: '🔧' },
        { name: '家电', icon: '📺' },
        { name: '家居', icon: '🛋️' },
        { name: '育儿', icon: '👶' },
        { name: '教育', icon: '🎓' },
        { name: '其他', icon: '📝' }
      ];

      try {
        // 尝试从本地存储加载用户自定义的类别
        const savedCategories = uni.getStorageSync('userCategories')
        if (savedCategories && Array.isArray(JSON.parse(savedCategories))) {
          this.displayCategories = JSON.parse(savedCategories)
        } else {
          // 第一次使用或数据被清空，设置默认显示的类别
          // 显示指定的16个分类
          const defaultCategories = ['餐饮', '水果', '零食', '日用', '数码', '住房', '娱乐', '汽车', '通讯', '购物', '交通', '医疗', '宠物', '社交', '学习', '其他'];
          this.displayCategories = allCategories.filter(cat => defaultCategories.includes(cat.name));
          this.saveCategoriesToStorage()
        }
      } catch (e) {
        console.error('加载类别失败', e)
        // 默认显示指定的16个分类
        const defaultCategories = ['餐饮', '水果', '零食', '日用', '数码', '住房', '娱乐', '汽车', '通讯', '购物', '交通', '医疗', '宠物', '社交', '学习', '其他'];
        this.displayCategories = allCategories.filter(cat => defaultCategories.includes(cat.name));
      }
    },
    
    saveCategoriesToStorage() {
      try {
        uni.setStorageSync('userCategories', JSON.stringify(this.displayCategories))
      } catch (e) {
        console.error('保存类别失败', e)
      }
    }
  }
}
</script>

<style lang="css">
.add-record-container {
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
  box-sizing: border-box;
}
  
.add-record-container .form-item {
  background-color: #fff;
  padding: 16px;
  margin-bottom: 15px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
    
.add-record-container .form-item .label {
  font-size: 15px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
}
    
.add-record-container .form-item .input-field {
  font-size: 24px;
  color: #333;
  width: 100%;
  padding: 8px 0;
  margin-top: 5px;
}
    
.add-record-container .form-item .date-picker {
  width: 100%;
  height: 42px;
  line-height: 42px;
  font-size: 16px;
  color: #333;
  padding: 0 5px;
}
    
.add-record-container .form-item .remarks-input {
  width: 100%;
  height: 80px;
  font-size: 16px;
  padding: 10px 5px;
  line-height: 1.5;
  color: #333;
  box-sizing: border-box;
}
  
.add-record-container .category-section {
  background-color: #fff;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
    
.add-record-container .category-section .label {
  font-size: 15px;
  color: #333;
  margin-bottom: 12px;
  font-weight: 500;
}
    
.add-record-container .category-section .category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  padding: 20rpx 0;
}
    
.add-record-container .category-section .category-grid .category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15rpx 10rpx;
  box-sizing: border-box;
  border-radius: 12rpx;
  background-color: #fafafa;
  transition: all 0.3s;
}
        
.add-record-container .category-section .category-grid .category-item .category-icon-wrapper {
  width: 90rpx;
  height: 90rpx;
  background-color: #fff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}
        
.add-record-container .category-section .category-grid .category-item .category-icon {
  font-size: 42rpx;
}
        
.add-record-container .category-section .category-grid .category-item .category-name {
  font-size: 24rpx;
  color: #666;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
        
.add-record-container .category-section .category-grid .category-item.active {
  background-color: rgba(24, 144, 255, 0.08);
}
        
.add-record-container .category-section .category-grid .category-item.active .category-icon-wrapper {
  background-color: #1890ff;
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.3);
}
        
.add-record-container .category-section .category-grid .category-item.active .category-name {
  color: #1890ff;
  font-weight: bold;
}
  
.add-record-container .save-button {
  margin-top: 24px;
  width: 100%;
  height: 46px;
  line-height: 46px;
  text-align: center;
  background-color: #1890ff;
  color: #fff;
  font-size: 16px;
  border-radius: 23px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  transition: all 0.2s ease;
}
    
.add-record-container .save-button:active {
  transform: translateY(2px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}
  
.add-record-container .form-title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-left: 5px;
}

.add-container {
  padding: 20rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.form-card {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.amount-section {
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.amount-label {
  font-size: 30rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
  font-weight: 500;
}

.amount-input-container {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
}

.currency-symbol {
  font-size: 52rpx;
  color: #333;
  margin-right: 12rpx;
  font-weight: bold;
}

.amount-input {
  font-size: 64rpx;
  font-weight: bold;
  flex: 1;
  padding: 12rpx 0;
  color: #333;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item.date-item,
.form-item.remark-item {
  height: 90rpx;
}

.form-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 30rpx;
  color: #666;
  font-weight: 500;
}

/* 日期选择器样式 */
.date-picker {
  text-align: right;
  flex: 1;
}

/* 日期选择器内容 */
.calendar-tab-content {
  background-color: #f8f9fc;
  min-width: 220rpx;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(24, 144, 255, 0.15);
  padding: 0 25rpx;
  transition: all 0.3s ease;
  float: right;
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

.input {
  font-size: 30rpx;
  color: #333;
  text-align: right;
  flex: 1;
  height: 70rpx;
  background-color: #f8f9fc;
  border-radius: 35rpx;
  padding: 0 30rpx;
}

.category-section {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  color: #666;
  font-weight: bold;
}

.section-action {
  font-size: 26rpx;
  color: #1890ff;
}

.tips {
  margin-bottom: 20rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #999;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  padding: 20rpx 0;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15rpx 10rpx;
  box-sizing: border-box;
  border-radius: 12rpx;
  background-color: #fafafa;
  transition: all 0.3s;
}

.category-icon-wrapper {
  width: 90rpx;
  height: 90rpx;
  background-color: #fff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  position: relative;
}

.category-icon {
  font-size: 42rpx;
}

.category-name {
  font-size: 24rpx;
  color: #666;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.category-item.active {
  background-color: rgba(24, 144, 255, 0.08);
}

.category-item.active .category-icon-wrapper {
  background-color: #1890ff;
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.3);
}

.category-item.active .category-name {
  color: #1890ff;
  font-weight: bold;
}

.save-button {
  background-color: #1890ff;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 45rpx;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.3);
  transition: all 0.3s;
}

.save-button:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(24, 144, 255, 0.2);
}

/* 类别管理样式 */
.manager-section {
  margin-bottom: 30rpx;
}

.manager-title {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
}

.category-manageable {
  position: relative;
}

.delete-icon, .add-icon {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  background-color: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24rpx;
  font-weight: bold;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.2);
  z-index: 2;
}

.add-icon {
  background-color: #52c41a;
}

.custom-category {
  background-color: #f0f2f5;
  border: 1rpx dashed #d9d9d9;
}

/* 自定义类别弹窗 */
.custom-category-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-content {
  width: 80%;
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.modal-header {
  padding: 30rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-body {
  padding: 30rpx;
}

.icon-scroll {
  display: flex;
  white-space: nowrap;
  margin-top: 10rpx;
}

.icon-item {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 80rpx;
  height: 80rpx;
  margin-right: 20rpx;
  background-color: #f5f5f5;
  border-radius: 10rpx;
  font-size: 36rpx;
}

.icon-selected {
  background-color: #1890ff;
  color: #fff;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 90rpx;
  line-height: 90rpx;
  text-align: center;
  font-size: 28rpx;
  border-radius: 0;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background-color: #1890ff;
  color: #fff;
}
</style> 